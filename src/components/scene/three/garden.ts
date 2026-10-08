import * as THREE from 'three'
import type { SceneEvent, SceneState } from '../../../services/scene'
import { createKit, createLoop, createRenderer, disposeTree, isLowPower, pageBackground, seeded } from './common'
import { gardenPalette, gardenRig, lighting } from './environment'
import {
  PINES, TREE, TREE2,
  groundHeight, makeCabin, makeDistantTrees, makeFence, makeFlowers, makeGrass, makeGround, makeLake, makeLeafyTree, makePine, makeRange, makeRock, makeTree, riverPoint, treeSpots,
} from './garden-models'
import {
  Butterfly, Dragonfly, Duck, FallingLeaves, Fireflies, Fish, Flock, Frog, Hedgehog, PerchedBird, Rabbit, Ripples, Smoke, Squirrel, Swallow,
} from './creatures'

export interface GardenWorld {
  setState(state: SceneState, dark: boolean): void
  resize(width: number, height: number): void
  setActive(active: boolean): void
  setReducedMotion(reduced: boolean): void
  fire(event: SceneEvent): void
  dispose(): void
}

/** 页底 3D 花园：远山、缓坡、湖泊、木屋、四季树木与小动物 */
export function createGardenWorld(canvas: HTMLCanvasElement): GardenWorld {
  const lowPower = isLowPower()
  const renderer = createRenderer(canvas, lowPower)
  renderer.shadowMap.enabled = !lowPower
  renderer.shadowMap.type = THREE.PCFShadowMap
  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(26, 4, 0.5, 420)
  const kit = createKit()
  scene.fog = new THREE.Fog(0xf2f4f7, 40, 190)

  const hemi = new THREE.HemisphereLight(0xdcecff, 0xb5c4a2, 1.4)
  const sun = new THREE.DirectionalLight(0xfff3e2, 2.4)
  sun.castShadow = !lowPower
  sun.shadow.mapSize.set(1536, 1536)
  Object.assign(sun.shadow.camera, { left: -32, right: 32, top: 22, bottom: -14, near: 1, far: 160 })
  sun.shadow.bias = -0.0006
  sun.shadow.normalBias = 0.03
  sun.target.position.set(0, 0, -5)
  scene.add(hemi, sun, sun.target)

  /* —— 地形与远景 —— */
  const ground = makeGround(lowPower)
  scene.add(ground.mesh)
  const ranges = [makeRange(-152, 36, 3, 9), makeRange(-118, 25, 7, 8), makeRange(-84, 15, 13, 6)]
  ranges.forEach(range => scene.add(range.mesh))
  const hills = makeRange(-48, 6.5, 17, 5)
  scene.add(hills.mesh)
  const distantTrees = makeDistantTrees(0x6f9a72, lowPower ? 36 : 70)
  scene.add(distantTrees)

  /* —— 湖、木屋、栅栏、树 —— */
  const lake = makeLake(kit)
  scene.add(lake.group)
  const cabin = makeCabin(kit)
  scene.add(cabin.group)
  scene.add(makeFence(kit))
  const tree = makeTree(kit, 41, true)
  tree.group.position.set(TREE.x, groundHeight(TREE.x, TREE.z), TREE.z)
  scene.add(tree.group)
  const tree2 = makeTree(kit, 59, false)
  tree2.group.position.set(TREE2.x, groundHeight(TREE2.x, TREE2.z), TREE2.z)
  tree2.group.scale.setScalar(TREE2.scale)
  scene.add(tree2.group)
  const pines = PINES.map(p => {
    const pine = makePine(kit, p.s)
    pine.group.position.set(p.x, groundHeight(p.x, p.z), p.z)
    scene.add(pine.group)
    return { pine, phase: p.x }
  })
  const rockRand = seeded(3)
  for (let i = 0; i < 7; i++) {
    // 河岸卵石
    const bank = riverPoint(0.45 + rockRand() * 0.5, (rockRand() < 0.5 ? -1 : 1) * (1.15 + rockRand() * 0.3))
    const rock = makeRock(kit, 0.25 + rockRand() * 0.35, i)
    rock.position.set(bank.x, groundHeight(bank.x, bank.z) + 0.05, bank.z)
    scene.add(rock)
  }
  // 白桦、圆叶树、伞形树：随机错落在远近不同的位置
  const leafy = treeSpots(lowPower ? 8 : 14, 77).map((spot, i) => {
    const t = makeLeafyTree(kit, spot.kind, 100 + i * 17)
    t.group.position.set(spot.x, groundHeight(spot.x, spot.z) - 0.05, spot.z)
    t.group.rotation.y = i * 1.3
    t.group.scale.setScalar(spot.s)
    scene.add(t.group)
    return { tree: t, phase: spot.x * 0.7 + spot.z }
  })
  const grass = makeGrass(lowPower ? 1500 : 3400)
  scene.add(grass.mesh)
  const flowers = makeFlowers(lowPower ? 90 : 200)
  scene.add(flowers.mesh)

  /* —— 小动物 —— */
  const squirrel = new Squirrel(kit)
  const flock = new Flock(kit)
  const swallow = new Swallow(kit)
  const rabbit = new Rabbit(kit)
  const hedgehog = new Hedgehog(kit)
  const ripples = new Ripples(28)
  const fish = new Fish(kit, p => ripples.spawn(p, 0.45))
  const ducks = [new Duck(kit, 1, p => ripples.spawn(p, 0.3, 1.8)), new Duck(kit, 2, p => ripples.spawn(p, 0.3, 1.8))]
  const padPositions = lake.pads.children.slice(0, 5).map(pad => pad.position.clone().setY(0.06))
  const frog = new Frog(kit, padPositions)
  const butterflies = [
    new Butterfly(kit, new THREE.Vector3(-1.5, groundHeight(-1.5, 3), 3), [0xf2b6c9, 0xf6d77a], 1),
    new Butterfly(kit, new THREE.Vector3(6.5, groundHeight(6.5, 1.5), 1.5), [0x9ec5e8, 0xf3c160], 2),
  ]
  const dragonfly = new Dragonfly(kit)
  const fireflies = new Fireflies(lowPower ? 9 : 16)
  const leaves = new FallingLeaves(10)
  const smoke = new Smoke(cabin.chimneyTop)
  const perched = new PerchedBird(kit)
  perched.object.position.copy(tree.perch)
  perched.object.rotation.y = Math.PI * 0.72
  tree.group.add(perched.object)
  scene.add(squirrel.object, flock.object, swallow.object, rabbit.object, hedgehog.object, fish.object, ripples.object, frog.object, dragonfly.object, fireflies.object, leaves.object, smoke.object)
  ducks.forEach(duck => scene.add(duck.object))
  butterflies.forEach(b => scene.add(b.object))

  let current: SceneState | null = null
  let reduced = false
  let active = false
  let wind = 0
  let rainIntensity = 0
  let leafColor = 0xdca24a
  /** 松鼠一会儿上树、一会儿下树 */
  let squirrelMode: 'up' | 'down' = 'up'

  function applyState(state: SceneState, dark: boolean) {
    current = state
    const snowy = state.sky === 'snow'
    const wet = state.sky === 'drizzle' || state.sky === 'rain' || state.sky === 'storm'
    const palette = gardenPalette(state.season, snowy)
    const frozen = state.season === 'winter'
    const lit = state.phase !== 'night'

    ground.recolor(palette, wet)
    ranges.forEach((range, i) => range.recolor(i === 0 ? palette.mountainFar : palette.mountainNear, palette.snowLine + i * 0.06))
    hills.recolor(palette.hill, 2)
    ;(distantTrees.material as THREE.MeshLambertMaterial).color.setHex(snowy ? 0xdfe6e3 : palette.pine[0])
    grass.recolor(palette.grass)
    flowers.recolor(palette.flowers)
    tree.setSeason(palette, snowy)
    tree2.setSeason(palette, snowy)
    leafy.forEach(({ tree: t }) => t.setSeason(palette, snowy, state.season))
    pines.forEach(({ pine }) => { pine.setColors(palette.pine); pine.snow.visible = snowy })
    lake.setFrozen(frozen, palette)
    cabin.roofSnow.visible = snowy
    const evening = state.phase === 'night' || state.phase === 'dusk'
    cabin.window.emissiveIntensity = state.phase === 'night' ? 1.4 : evening ? 0.8 : 0
    cabin.light.intensity = state.phase === 'night' ? 6 : evening ? 2.5 : 0
    smoke.enabled = frozen || snowy || state.season === 'autumn' || evening
    smoke.setTint(state.phase === 'night' ? (dark ? 0x5c6270 : 0x9aa0aa) : 0xffffff)

    const light = lighting(state, dark)
    sun.color.setHex(light.sunColor)
    sun.intensity = light.sunIntensity
    sun.position.set(light.sunDir[0] * 80, light.sunDir[1] * 80, light.sunDir[2] * 80 - 5)
    hemi.color.setHex(light.hemiSky)
    hemi.groundColor.setHex(light.hemiGround)
    hemi.intensity = light.hemiIntensity

    const fog = scene.fog as THREE.Fog
    fog.color.copy(pageBackground())
    ;[fog.near, fog.far] = state.sky === 'fog' ? [14, 75] : wet || snowy ? [28, 130] : [42, 200]

    wind = state.wind
    grass.uniforms.uWind.value = [0.1, 0.24, 0.42][wind]!
    grass.uniforms.uLean.value = [0, 0.08, 0.2][wind]!
    rainIntensity = frozen ? 0 : { drizzle: 0.7, rain: 1.6, storm: 2.6 }[state.sky as 'drizzle'] ?? 0
    leafColor = state.season === 'spring' ? 0xf4bfcc : state.season === 'summer' ? 0x86b873 : state.season === 'autumn' ? 0xdca24a : 0xa8957a

    butterflies.forEach(b => { b.object.visible = lit && state.sky === 'clear' && !frozen })
    dragonfly.object.visible = lit && (state.sky === 'partly' || state.sky === 'overcast') && !frozen
    fireflies.object.visible = state.phase === 'night' && state.warm
    ducks.forEach(duck => { duck.object.visible = !frozen && state.sky !== 'storm' })
    frog.object.visible = wet && !frozen
    perched.set(wet || state.wind >= 2 ? 'none' : !lit ? 'owl' : frozen || snowy ? 'robin' : 'sparrow')
    if (!lit) squirrel.object.visible = false
    if (reduced || !active) loop.renderOnce()
  }

  let worldTime = 0
  function frame(_time: number, rawDt: number) {
    // 调试：预览时可设 window.__gardenTimeScale = 0.1 慢放，逐帧检查动作
    const debug = globalThis as { __gardenTimeScale?: number; __gardenDebug?: { squirrel: number; butterflies: { x: number; y: number }[] } }
    const dt = rawDt * (debug.__gardenTimeScale ?? 1)
    worldTime += dt
    if (debug.__gardenTimeScale !== undefined) {
      const toScreen = (v: THREE.Vector3) => { const p = v.clone().project(camera); return { x: ((p.x + 1) / 2) * canvas.clientWidth, y: ((1 - p.y) / 2) * canvas.clientHeight } }
      debug.__gardenDebug = { squirrel: squirrel.elapsed, butterflies: butterflies.map(b => toScreen(b.object.position)) }
    }
    const time = worldTime
    if (dt > 0) {
      grass.uniforms.uTime.value = time
      const amp = [0.012, 0.03, 0.06][wind]!
      tree.crown.rotation.z = Math.sin(time * 0.9) * amp + (wind === 2 ? 0.03 : 0)
      tree.crown.rotation.x = Math.sin(time * 0.7 + 1) * amp * 0.5
      tree2.crown.rotation.z = Math.sin(time * 1.1 + 2) * amp
      leafy.forEach(({ tree: t, phase }) => { t.leaves.rotation.z = Math.sin(time * 0.95 + phase) * amp * 0.7; t.leaves.rotation.x = Math.sin(time * 0.8 + phase) * amp * 0.4 })
      pines.forEach(({ pine, phase }) => { pine.group.rotation.z = Math.sin(time * 0.8 + phase) * amp * 0.4 })
      squirrel.update(dt)
      flock.update(dt)
      swallow.update(dt)
      rabbit.update(dt)
      hedgehog.update(dt)
      frog.update(dt)
      fish.update(dt)
      perched.update(time, dt)
      if (ducks[0]!.object.visible) ducks.forEach(duck => duck.update(time, dt, 1))
      butterflies.forEach(b => { if (b.object.visible) b.update(time) })
      if (dragonfly.object.visible) dragonfly.update(time, dt)
      if (fireflies.object.visible) fireflies.update(time)
      leaves.update(dt, wind * 0.25)
      smoke.update(dt, wind * 0.25)
      ripples.rain(rainIntensity, dt)
      ripples.update(dt)
    }
    renderer.render(scene, camera)
  }
  const loop = createLoop(frame, lowPower ? 30 : 60)

  return {
    setState: applyState,
    resize(width, height) {
      if (width < 2 || height < 2) return
      renderer.setSize(width, height, false)
      const rig = gardenRig(width / height)
      camera.aspect = width / height
      camera.fov = rig.fov
      camera.position.set(...rig.position)
      camera.lookAt(new THREE.Vector3(...rig.target))
      camera.updateProjectionMatrix()
      loop.renderOnce()
    },
    setActive(next) {
      active = next
      if (next && !reduced) loop.start()
      else { loop.stop(); loop.renderOnce() }
    },
    setReducedMotion(next) {
      reduced = next
      if (reduced) { loop.stop(); loop.renderOnce() }
      else if (active) loop.start()
    },
    fire(event) {
      if (reduced || !current) return
      const dir = Math.random() > 0.5 ? 1 : -1
      switch (event) {
        case 'squirrel': if (!squirrel.active && current.phase !== 'night') { squirrel.run(tree.group.position.clone(), camera.position, squirrelMode); squirrelMode = squirrelMode === 'up' ? 'down' : 'up' } break
        case 'rabbit': rabbit.run(dir); break
        case 'hedgehog': hedgehog.walk(-8 + Math.random() * 8); break
        case 'frog': if (frog.object.visible) frog.hop(); break
        case 'birds': flock.fly(dir); break
        case 'swallow': swallow.skim(); break
        case 'perch': perched.hopNow(); break
        case 'fish': if (ducks[0]!.object.visible) fish.jump(); break
        case 'leaf': {
          const from = new THREE.Vector3(0, 3.6, 0.4).add(tree.group.position)
          leaves.drop(from, leafColor, current.season === 'winter' ? 1 : 3)
          break
        }
        default: break
      }
    },
    dispose() {
      loop.stop()
      disposeTree(scene)
      kit.dispose()
      renderer.dispose()
      renderer.forceContextLoss()
    },
  }
}
