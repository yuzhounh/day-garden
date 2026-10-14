import test from 'node:test'
import assert from 'node:assert/strict'
import { build } from 'esbuild'
import { createRequire } from 'node:module'
import vm from 'node:vm'
import { resolve } from 'node:path'
import * as THREE from 'three'

const require = createRequire(import.meta.url)
const root = resolve(import.meta.dirname, '..')
const state = { sky: 'partly', phase: 'night', season: 'autumn', wind: 0, moon: 0.15, altitude: 0.8, dayProgress: null, warm: false, live: true }

// Use real geometry, projection and scene code; replace only the GPU and animation scheduler.
async function sky() {
  const compile = async (entry, external = []) => {
    const result = await build({ entryPoints: [resolve(root, entry)], bundle: true, platform: 'node', format: 'cjs', write: false, external: ['three', ...external], loader: { '.jpg': 'dataurl' }, logLevel: 'silent' })
    const module = { exports: {} }
    vm.runInNewContext(result.outputFiles[0].text, { module, exports: module.exports, require: name => name.endsWith('/common') ? common : name === 'three' ? { ...THREE, TextureLoader: class { load() { return new THREE.Texture() } } } : require(name), console })
    return module.exports
  }
  const realCommon = await compile('src/components/scene/three/common.ts')
  let frame, scene, camera, moon
  const common = {
    ...realCommon,
    isLowPower: () => false,
    radialTexture: () => new THREE.Texture(),
    streakTexture: () => new THREE.Texture(),
    createRenderer: () => ({ setSize() {}, clear() {}, dispose() {}, forceContextLoss() {}, render(s, c) { scene = s; camera = c; moon = s.children.find(child => child.material?.isShaderMaterial) || moon } }),
    createLoop: callback => { frame = callback; return { start() {}, stop() {}, renderOnce: () => callback(0, 0) } },
  }
  const { createSkyWorld } = await compile('src/components/scene/three/sky.ts', ['./common'])
  const world = createSkyWorld({})
  world.setLayout(1440, 400, { x: 900, y: 90, r: 32 })
  world.setState(state, false)
  const clouds = scene.children.filter(child => child.isMesh && child.material.isMeshLambertMaterial && child.visible)
  return { world, clouds, camera, frame, moon }
}

test('Moving the moon and updating time or theme preserve every cloud position', async () => {
  const { world, clouds, frame } = await sky()
  frame(50, 0.1)
  const before = clouds.map(cloud => cloud.position.toArray())
  world.setLayout(1440, 400, { x: 900, y: 91, r: 32 })
  world.setState({ ...state, altitude: 0.79, moon: 0.16 }, true)
  assert.deepEqual(clouds.map(cloud => cloud.position.toArray()), before)
  frame(50.1, 0.1)
  clouds.forEach((cloud, i) => assert.ok(cloud.position.x > before[i][0], 'clouds keep moving right'))
  world.dispose()
})

test('A real viewport resize preserves drift progress instead of restoring the seed positions', async () => {
  const { world, clouds, frame } = await sky()
  frame(50, 0.1)
  const before = clouds.map(cloud => cloud.position.x)
  world.setLayout(1200, 400, { x: 800, y: 90, r: 32 })
  clouds.forEach((cloud, i) => assert.ok(Math.abs(cloud.position.x - before[i] * 1200 / 1440) < 1e-9))
  world.dispose()
})

test('Clouds wrap only while fully outside the viewport and keep the overshoot distance', async () => {
  const { world, clouds, camera, frame } = await sky()
  for (const width of [1440, 390]) {
    world.setLayout(width, 400, { x: width * 0.65, y: 90, r: 32 })
    const frustum = new THREE.Frustum().setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse))
    for (const cloud of clouds.filter(cloud => cloud.visible)) {
      const bounds = cloud.geometry.boundingSphere
      const radius = (bounds.radius + bounds.center.length()) * cloud.scale.x
      const edge = (camera.position.z - cloud.position.z + radius) * Math.tan(camera.fov * Math.PI / 360) * camera.aspect + radius
      cloud.position.x = edge - 0.001
      cloud.updateMatrixWorld(true)
      assert.equal(frustum.intersectsObject(cloud), false, 'the cloud fully exits before wrapping')
      const previous = cloud.position.x
      frame(60, 0.1)
      assert.ok(cloud.position.x < 0, 'the cloud wraps')
      const travelled = cloud.position.x + 2 * edge - previous
      assert.ok(travelled > 0 && travelled < 0.1, 'wrap keeps the small forward step')
      cloud.updateMatrixWorld(true)
      assert.equal(frustum.intersectsObject(cloud), false, 'the whole cloud is outside on re-entry')
    }
  }
  world.dispose()
})

test('The moon faces the observer at both edges so the phase does not depend on screen position', async () => {
  const { world, moon, camera } = await sky()
  for (const x of [100, 720, 1340]) {
    world.setLayout(1440, 400, { x, y: 90, r: 32 })
    const front = new THREE.Vector3(0, 0, 1).applyQuaternion(moon.quaternion)
    const observer = camera.position.clone().sub(moon.position).normalize()
    assert.ok(front.dot(observer) > 0.99999)
  }
  world.dispose()
})
