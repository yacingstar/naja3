"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";
import type { Mesh, MeshStandardMaterial, WebGLRenderer } from "three";
import type { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import type { Horloge } from "@/lib/horloges";

// L'horloge en trois dimensions, dans les couleurs choisies.
//
// ── Pourquoi de la 3D plutôt qu'une photo ou un dessin ──────────────────
//
// Le Duo avait déjà un dessin qui se repeint (HorlogeApercu), et il reste : sur
// une carte de boutique ou un récapitulatif de commande, un dessin plat est la
// bonne réponse, et une page qui démarre un moteur 3D pour une vignette de
// 200 pixels serait absurde.
//
// La Télé, elle, ne peut pas être dessinée à plat. C'est une horloge à DEUX
// cadrans qui se fixe au mur par le côté : tout ce qu'il faut comprendre avant
// d'acheter — qu'elle dépasse, qu'elle se lit des deux bouts du couloir, que
// les deux faces donnent la même heure — est précisément ce qu'une vue de face
// ne montre pas. Il faut pouvoir la tourner.
//
// ── Ce qui coûte, et ce qu'on fait pour que ça ne coûte pas ─────────────
//
// three.js et le modèle pèsent, et la quasi-totalité des clientes arrive
// d'Instagram sur un téléphone. Donc :
//   - rien n'est chargé tant qu'on n'est pas sur la fiche produit : le moteur
//     arrive par un `import()` dans un effet, jamais dans le paquet du site ;
//   - une image occupe la place AVANT, pendant, et à la place si ça échoue.
//     L'horloge est visible à la première seconde, dans les bonnes couleurs ;
//   - le rendu s'arrête net dès que la visionneuse sort de l'écran. En bas du
//     formulaire de commande, on ne fait plus tourner un GPU pour rien ;
//   - `devicePixelRatio` plafonné à 2.
//
// Et si WebGL n'existe pas sur ce téléphone, il ne se passe rien de grave :
// l'image reste, le configurateur en dessous fonctionne, la commande part.

export type Horloge3DProps = {
  horloge: Horloge;
  // La couleur de chaque zone, par slot : { fond: "#1b4d2e", … }
  couleurs: Record<string, string>;
  // L'état des options, par id : { logo: false }
  options: Record<string, boolean>;
  titre: string;
  // Ce qui occupe la place avant que la 3D démarre, et à sa place si elle ne
  // démarre jamais. Un élément et non une adresse d'image, parce que les deux
  // horloges n'ont pas le même repli : la Télé a un rendu figé, le Duo a son
  // dessin SVG, qui lui se repeint dans les couleurs choisies. Sans WebGL, le
  // Duo garde donc un aperçu exact et vivant.
  secours: ReactNode;
  className?: string;
};

// Les deux flèches qui encadrent la main : elles disent le SENS du geste.
// Sans elles, une main qui va et vient peut se lire comme « appuyez ici ».
function Chevron({ sens }: { sens: "gauche" | "droite" }) {
  return (
    <svg
      width="14"
      height="22"
      viewBox="0 0 14 22"
      className="naja-doigt-clignote"
      style={{ transform: sens === "gauche" ? "scaleX(-1)" : undefined }}
    >
      <path
        d="M3 3 L11 11 L3 19"
        fill="none"
        stroke="var(--color-encre)"
        strokeWidth="3.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity=".55"
      />
    </svg>
  );
}

// Le fond de scène, repris du cadre de la photo des veilleuses pour que la
// page reste d'une seule pièce.
const FOND = "radial-gradient(circle at 50% 38%, rgba(255,253,247,.9), rgba(255,253,247,0) 70%)";

export function Horloge3D({
  horloge,
  couleurs,
  options,
  titre,
  secours,
  className = "",
}: Horloge3DProps) {
  const hote = useRef<HTMLDivElement>(null);

  // Trois poignées vers la scène, posées une fois le modèle chargé. Des refs
  // et non des états : les changer ne doit JAMAIS redessiner le composant
  // React, sans quoi chaque image de l'animation provoquerait un rendu.
  const repeindre = useRef<((c: Record<string, string>, o: Record<string, boolean>) => void) | null>(null);
  const allerVue = useRef<((id: string) => void) | null>(null);
  // Ce qui arrête l'oscillation : le doigt sur la scène, mais aussi un clic
  // sur « Face » ou « Dos ». Sans cette poignée, choisir une vue la cadrait
  // puis la caméra repartait toute seule une image plus tard.
  const couperOscillation = useRef<(() => void) | null>(null);
  // Les couleurs du moment, lisibles depuis le chargement du modèle — qui se
  // termine bien après l'effet de montage, avec les couleurs d'alors.
  const peintureActuelle = useRef({ couleurs, options });

  const [etat, setEtat] = useState<"charge" | "prete" | "sansTroisD">("charge");
  const [vue, setVue] = useState(horloge.vues[0]?.id ?? "");
  // L'invite disparaît au premier contact, et ne revient pas.
  const [touchee, setTouchee] = useState(false);
  // Elle s'efface aussi toute seule au bout de cinq secondes, touchée ou non :
  // une main qui fait le même geste en boucle pendant qu'on lit le prix finit
  // par agacer, et le message est passé bien avant.
  const [indiceFini, setIndiceFini] = useState(false);

  // ── Le montage de la scène, une seule fois ────────────────────────────
  useEffect(() => {
    let annule = false;
    let demonter: (() => void) | null = null;

    (async () => {
      let THREE: typeof import("three");
      let Loader: typeof import("three/examples/jsm/loaders/GLTFLoader.js").GLTFLoader;
      let Controls: typeof import("three/examples/jsm/controls/OrbitControls.js").OrbitControls;
      try {
        const [t, l, c] = await Promise.all([
          import("three"),
          import("three/examples/jsm/loaders/GLTFLoader.js"),
          import("three/examples/jsm/controls/OrbitControls.js"),
        ]);
        THREE = t;
        Loader = l.GLTFLoader;
        Controls = c.OrbitControls;
      } catch {
        // Le moteur n'est pas arrivé (réseau coupé en cours de route). L'image
        // reste, et c'est tout ce que la cliente a besoin de savoir.
        if (!annule) setEtat("sansTroisD");
        return;
      }
      if (annule) return;
      const boite = hote.current;
      if (!boite) return;

      let renderer: WebGLRenderer;
      try {
        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      } catch {
        setEtat("sansTroisD");
        return;
      }
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 0.95;
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.domElement.style.display = "block";
      renderer.domElement.style.width = "100%";
      renderer.domElement.style.height = "100%";
      boite.appendChild(renderer.domElement);

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(30, 1, 0.01, 8);

      // Les intensités viennent de la démo fournie, écrite pour three.js r147,
      // multipliées par π : depuis r155 les lampes sont physiquement correctes
      // et ce facteur est exactement ce que l'ancien mode appliquait en
      // coulisses. Sans lui, la même scène est quatre fois trop sombre.
      const PI = Math.PI;
      scene.add(new THREE.HemisphereLight(0xfff6e8, 0x6a6455, 0.58 * PI));
      const cle = new THREE.DirectionalLight(0xffffff, 1.2 * PI);
      cle.position.set(0.3, 0.45, 0.5);
      cle.castShadow = true;
      cle.shadow.mapSize.set(2048, 2048);
      cle.shadow.bias = -0.0004;
      cle.shadow.normalBias = 0.0008;
      Object.assign(cle.shadow.camera, {
        left: -0.32,
        right: 0.32,
        top: 0.32,
        bottom: -0.32,
        near: 0.1,
        far: 2.4,
      });
      cle.shadow.camera.updateProjectionMatrix();
      scene.add(cle);
      const appoint = new THREE.DirectionalLight(0xffffff, 0.95 * PI);
      appoint.position.set(-0.35, 0.3, -0.5);
      scene.add(appoint);

      const controls: OrbitControls = new Controls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.enablePan = false;

      // ── Rendre la page à la page ────────────────────────────────────────
      //
      // Sur un téléphone, la visionneuse occupe toute la largeur et la moitié
      // de la hauteur. Le doigt qui remonte pour lire le prix tombe forcément
      // dessus — et OrbitControls, laissé à lui-même, écrit touch-action:none
      // sur sa toile et avale le geste : l'horloge tourne, la page ne bouge
      // pas, et la cliente est coincée devant un objet qui pivote.
      //
      // `pan-y` rend le glissement VERTICAL au navigateur et garde
      // l'horizontal pour la rotation. C'est le bon partage pour une horloge
      // murale : ce qu'on veut voir, c'est son profil et son dos, et on
      // l'obtient en tournant de gauche à droite. Le haut et le bas restent
      // accessibles par les boutons de vue.
      //
      // Posé APRÈS la construction, qui écrit « none » dans le constructeur.
      renderer.domElement.style.touchAction = "pan-y";

      // Même chose à la souris : la molette appartient à la page. On arrête
      // l'événement en phase de capture sur le conteneur — il n'atteint donc
      // jamais l'écouteur d'OrbitControls, qui aurait annulé le défilement —
      // sans jamais appeler preventDefault, donc la page défile normalement.
      // Le zoom à deux doigts, lui, continue de fonctionner.
      const molette = (e: Event) => e.stopPropagation();
      boite.addEventListener("wheel", molette, { capture: true });

      const centre = new THREE.Vector3();
      let rayon = 0.15;
      const pieces: Record<string, Mesh> = {};
      let prete = false;

      function cadrer(id: string) {
        const v = horloge.vues.find((x) => x.id === id) ?? horloge.vues[0];
        if (!v) return;
        const d = new THREE.Vector3(...v.direction).normalize().multiplyScalar(rayon * v.distance);
        camera.position.copy(centre).add(d);
        controls.target.copy(centre);
        controls.update();
      }

      function dimensionner() {
        // Relu plutôt que capturé : une fonction déclarée (et donc hissée en
        // tête de bloc) perd le rétrécissement de type de `boite`.
        const el = hote.current;
        if (!el) return;
        const l = el.clientWidth;
        const h = el.clientHeight;
        if (l === 0 || h === 0) return;
        renderer.setSize(l, h, false);
        camera.aspect = l / h;
        camera.updateProjectionMatrix();
      }

      // Repeindre, c'est changer la couleur de matériaux déjà en place : il
      // n'y a rien à recharger, et c'est pour ça que la cliente voit son
      // choix instantanément, sans attendre une autre photo.
      function peindre(c: Record<string, string>, o: Record<string, boolean>) {
        for (const zone of horloge.zones) {
          const hex = c[zone.slot];
          if (!hex) continue;
          for (const nom of zone.nodes) {
            const m = pieces[nom];
            if (m) (m.material as MeshStandardMaterial).color.set(hex);
          }
        }
        for (const d of horloge.teintesDerivees) {
          const m = pieces[d.node];
          const hex = c[d.depuis];
          if (m && hex) {
            (m.material as MeshStandardMaterial).color.set(hex).multiplyScalar(d.multiplier);
          }
        }
        for (const opt of horloge.options) {
          const actif = o[opt.id] ?? opt.defaut;
          for (const nom of opt.montrer) if (pieces[nom]) pieces[nom].visible = actif;
          for (const nom of opt.cacher) if (pieces[nom]) pieces[nom].visible = !actif;
        }
      }

      // L'heure qu'il est chez la visiteuse, pas dix heures dix. Une horloge
      // à l'arrêt dans une boutique d'horloges, ça se remarque.
      function mettreALHeure() {
        const d = new Date();
        const m = d.getMinutes() + d.getSeconds() / 60;
        const h = (d.getHours() % 12) + m / 60;
        for (const face of horloge.aiguilles) {
          const mm = pieces[face.minutes];
          const hh = pieces[face.heures];
          if (mm) mm.rotation.z = (face.sens * m * Math.PI * 2) / 60;
          if (hh) hh.rotation.z = (face.sens * h * Math.PI * 2) / 12;
        }
      }

      const decor = Object.fromEntries(horloge.decorFixe.map((d) => [d.node, d.hex]));
      const aNettoyer: Array<{ dispose: () => void }> = [];

      new Loader().load(
        horloge.modele,
        (gltf) => {
          if (annule) return;
          gltf.scene.traverse((o) => {
            const m = o as Mesh;
            if (!m.isMesh) return;
            // Des facettes nettes plutôt qu'un lissage : c'est ce qui donne le
            // rendu d'une pièce imprimée couche par couche, et non d'un objet
            // en plastique moulé. Les repères du Duo font exception, leurs
            // perles doivent rester rondes.
            if (horloge.lisses.includes(m.name)) {
              m.geometry.deleteAttribute("normal");
            } else {
              const ancienne = m.geometry;
              m.geometry = ancienne.toNonIndexed();
              ancienne.dispose();
            }
            m.geometry.computeVertexNormals();
            aNettoyer.push(m.geometry);
            const mat = new THREE.MeshStandardMaterial({
              roughness: 0.78,
              metalness: 0,
              color: decor[m.name] ?? 0xcccccc,
            });
            m.material = mat;
            aNettoyer.push(mat);
            m.castShadow = !(m.name in decor);
            m.receiveShadow = true;
            pieces[m.name] = m;
          });
          scene.add(gltf.scene);

          // Le cadrage ne tient compte que des pièces qui comptent : avec le
          // mur, la caméra reculerait pour le contenir et l'horloge finirait
          // en timbre-poste au milieu de l'écran.
          const boiteEnglobante = new THREE.Box3();
          for (const nom of horloge.cadrage) {
            if (pieces[nom]) boiteEnglobante.expandByObject(pieces[nom]);
          }
          boiteEnglobante.getCenter(centre);
          rayon = boiteEnglobante.getSize(new THREE.Vector3()).length() / 2;
          controls.minDistance = rayon * 1.6;
          controls.maxDistance = rayon * 7;

          dimensionner();
          cadrer(horloge.vues[0]?.id ?? "");
          peindre(peintureActuelle.current.couleurs, peintureActuelle.current.options);
          mettreALHeure();
          prete = true;
          repeindre.current = peindre;
          allerVue.current = cadrer;
          setEtat("prete");
        },
        undefined,
        () => {
          if (!annule) setEtat("sansTroisD");
        },
      );

      // ── La boucle ───────────────────────────────────────────────────────
      const sobre = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const depart = performance.now();
      let interagi = false;

      function boucle(t: number) {
        if (!prete) return;
        // Un lent va-et-vient tant que personne n'a touché : c'est ce qui dit
        // « cet objet se tourne » sans l'écrire. Il s'arrête au premier doigt,
        // et n'existe pas du tout pour qui a demandé moins d'animations.
        if (!interagi && !sobre) {
          const a = Math.sin((t - depart) / 2700) * 0.45;
          const d = rayon * (horloge.vues[0]?.distance ?? 3.4);
          camera.position.set(
            centre.x + Math.sin(a) * d,
            centre.y + rayon * 0.12,
            centre.z + Math.cos(a) * d,
          );
          camera.lookAt(centre);
        }
        mettreALHeure();
        controls.update();
        renderer.render(scene, camera);
      }

      function marquerContact() {
        if (interagi) return;
        interagi = true;
        setTouchee(true);
      }
      for (const t of ["pointerdown", "wheel", "touchstart"] as const) {
        renderer.domElement.addEventListener(t, marquerContact, { passive: true });
      }
      couperOscillation.current = marquerContact;

      const taille = new ResizeObserver(() => dimensionner());
      taille.observe(boite);

      // Hors de l'écran, on coupe la boucle pour de bon : `setAnimationLoop(null)`
      // et non un `return` en début de boucle, qui continuerait de réclamer une
      // image soixante fois par seconde pour ne rien faire.
      const fenetre = new IntersectionObserver((entrees) => {
        renderer.setAnimationLoop(entrees[0]?.isIntersecting ? boucle : null);
      });
      fenetre.observe(boite);
      renderer.setAnimationLoop(boucle);

      demonter = () => {
        renderer.setAnimationLoop(null);
        taille.disconnect();
        fenetre.disconnect();
        boite.removeEventListener("wheel", molette, { capture: true });
        controls.dispose();
        for (const t of ["pointerdown", "wheel", "touchstart"] as const) {
          renderer.domElement.removeEventListener(t, marquerContact);
        }
        for (const o of aNettoyer) o.dispose();
        renderer.dispose();
        renderer.domElement.remove();
        repeindre.current = null;
        allerVue.current = null;
        couperOscillation.current = null;
      };
    })();

    return () => {
      annule = true;
      demonter?.();
    };
  }, [horloge]);

  // Les couleurs, poussées dans la scène.
  useEffect(() => {
    peintureActuelle.current = { couleurs, options };
    repeindre.current?.(couleurs, options);
  }, [couleurs, options]);

  useEffect(() => {
    allerVue.current?.(vue);
  }, [vue, etat]);

  // Le compte à rebours ne démarre qu'une fois la 3D affichée : parti au
  // montage, il se serait écoulé pendant le téléchargement du modèle et
  // l'invite aurait disparu avant que l'objet n'apparaisse.
  useEffect(() => {
    if (etat !== "prete") return;
    const minuteur = setTimeout(() => setIndiceFini(true), 5000);
    return () => clearTimeout(minuteur);
  }, [etat]);

  const sansTroisD = etat === "sansTroisD";

  return (
    <div className={className}>
      <div
        role="img"
        aria-label={`${titre} — vue 3D, tournez-la du doigt`}
        className="relative aspect-square w-full overflow-hidden rounded-[2rem]"
        style={{ background: FOND }}
      >
        {/* Le repli est là d'abord et reste dessous : pendant le chargement
            il EST la page, et si la 3D ne démarre jamais il le reste. */}
        <div
          className={`absolute inset-0 transition-opacity duration-500 ${
            etat === "prete" ? "opacity-0" : "opacity-100"
          }`}
        >
          {secours}
        </div>
        <div
          ref={hote}
          aria-hidden={sansTroisD}
          className={`absolute inset-0 transition-opacity duration-500 ${
            etat === "prete" ? "opacity-100" : "opacity-0"
          }`}
        />

        {/* ── La main qui montre le geste ──────────────────────────────
            Une visionneuse 3D ressemble à une photo : rien, sur l'écran, ne
            dit qu'elle se tourne. La phrase le disait, mais on ne LIT pas une
            page de boutique, on la regarde. La main fait donc le geste à la
            place de la cliente, pendant cinq secondes.

            Toujours montée tant que la 3D est là, et masquée par l'opacité
            plutôt que retirée : ça lui laisse le temps de s'effacer en
            douceur au lieu de disparaître d'un coup. `pointer-events-none`
            sur tout le bloc — c'est une consigne, pas un bouton, et elle ne
            doit jamais voler le doigt à l'objet qu'elle désigne. */}
        {etat === "prete" ? (
          <div
            aria-hidden
            className={`pointer-events-none absolute inset-x-0 bottom-[7%] flex flex-col items-center gap-2 transition-opacity duration-700 ${
              touchee || indiceFini ? "opacity-0" : "opacity-100"
            }`}
          >
            <div className="flex items-center gap-2">
              <Chevron sens="gauche" />
              <span className="naja-doigt-glisse">
                {/* Une paume et un index, deux rectangles arrondis : le
                    registre du site est fait de formes pleines cernées de
                    noir, et une main détaillée y serait une pièce rapportée.
                    Blanche cernée d'encre, elle se voit sur toutes les
                    couleurs de bobine. */}
                <svg
                  width="40"
                  height="48"
                  viewBox="0 0 48 58"
                  className="naja-doigt-clignote"
                  style={{ filter: "drop-shadow(0 3px 7px rgba(36,28,33,.45))" }}
                >
                  <g
                    fill="var(--color-papier)"
                    stroke="var(--color-encre)"
                    strokeWidth="3.4"
                    strokeLinejoin="round"
                  >
                    <rect x="13" y="21" width="22" height="33" rx="11" />
                    <rect x="19" y="4" width="10" height="26" rx="5" />
                  </g>
                </svg>
              </span>
              <Chevron sens="droite" />
            </div>
            <p className="rounded-full bg-papier/90 px-3 py-1 text-[13px] font-semibold text-encre/75">
              Glissez le doigt pour la tourner
            </p>
          </div>
        ) : null}
      </div>

      {/* Les vues restent proposées même sans 3D : elles ne servent alors à
          rien, donc on les retire — un bouton qui ne fait rien est pire que
          pas de bouton. */}
      {etat === "prete" && horloge.vues.length > 1 ? (
        <div className="mt-3 flex flex-wrap justify-center gap-2">
          {horloge.vues.map((v) => {
            const actif = v.id === vue;
            return (
              <button
                key={v.id}
                type="button"
                aria-pressed={actif}
                onClick={() => {
                  couperOscillation.current?.();
                  setVue(v.id);
                  allerVue.current?.(v.id);
                }}
                className={`min-h-11 rounded-full px-4 font-heading text-[14px] font-semibold transition active:scale-95 ${
                  actif
                    ? "border-2 border-encre bg-encre text-papier"
                    : "border-2 border-encre/20 bg-papier hover:border-encre/50"
                }`}
              >
                {v.label}
              </button>
            );
          })}
        </div>
      ) : null}

      {sansTroisD ? (
        <p className="mt-3 text-center text-sm text-encre/60">
          Votre téléphone n&apos;affiche pas la vue 3D. Les couleurs que vous choisissez
          ci-dessous sont bien prises en compte dans votre commande.
        </p>
      ) : null}
    </div>
  );
}
