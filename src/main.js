import * as THREE from 'three'
import { Howl } from 'howler'
import { TextureLoader } from 'three'
import { LoadingManager } from 'three'

// Import Rapier with correct WebAssembly handling
import RAPIER from '@dimforge/rapier3d-compat'

class ThreeJSApp {
  constructor() {
    this.scene = null
    this.camera = null
    this.renderer = null
    this.world = null
    this.animationId = null
    this.objects = new Map()
    this.vehicle = null
    this.vehicleBody = null
    this.keys = {}
    this.textures = new Map()
    this.loadingManager = new LoadingManager()
    this.textureLoader = new TextureLoader(this.loadingManager)
    this.frameCount = 0
    this.lastTime = 0
    this.fps = 0
    // Control states
    this.controls = {
      forward: false,
      backward: false,
      left: false,
      right: false,
      boost: false,
      jump: false,
      interact: false
    }
    // Touch control
    this.touchStartX = 0
    this.touchStartY = 0
    this.touchCurrentX = 0
    this.touchCurrentY = 0
    // Gamepad
    this.gamepad = null
    // Camera settings
    this.cameraSettings = {
      distance: 8,
      minDistance: 3,
      maxDistance: 15,
      height: 3,
      minHeight: 1,
      maxHeight: 5,
      pitch: 0.3,
      minPitch: 0,
      maxPitch: Math.PI / 3,
      yaw: 0,
      smoothness: 0.1,
      collisionRadius: 0.5
    }
    // Camera target position and rotation
    this.cameraTarget = new THREE.Vector3()
    this.cameraDirection = new THREE.Vector3()
    // Audio system
    this.audio = {
      bgm: null,
      engine: null,
      horn: null,
      ambient: null,
      jump: null,
      boost: null,
      enabled: true,
      volume: 0.5,
      sfxVolume: 0.7
    }
    // POI system
    this.pois = []
    this.activePoi = null
    this.infoPanel = null
    // Map system
    this.map = null
    this.mapVisible = false
  }

  async init() {
    // Initialize physics engine
    await this.initPhysics()
    
    // Create scene
    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(0x87ceeb)
    
    // Create camera
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)
    this.camera.position.set(0, 2, 5)
    
    // Setup performance settings
    this.setupPerformanceSettings()
    
    // Initialize renderer with WebGPU support
    await this.initRenderer()
    
    // Setup lighting
    this.setupLighting()
    
    // Preload resources
    this.preloadResources()
    
    // Load textures
    await this.loadTextures()
    
    // Initialize audio system
    await this.initAudio()
    
    // Load scene objects
    await this.loadScene()
    
    // Create performance monitoring UI
    this.createPerformanceUI()
    
    // Optimize for mobile devices
    this.optimizeForMobile()
    
    // Setup event listeners
    this.setupEventListeners()
    
    // Start animation loop
    this.startAnimation()
  }

  async initAudio() {
    // Load audio files with Howler.js
    this.audio.bgm = new Howl({
      src: ['https://trae-api-cn.mchost.guru/api/ide/v1/text_to_speech?text=background%20music&voice=default'],
      loop: true,
      volume: this.audio.volume * 0.5
    })
    
    this.audio.engine = new Howl({
      src: ['https://trae-api-cn.mchost.guru/api/ide/v1/text_to_speech?text=engine%20sound&voice=default'],
      loop: true,
      volume: this.audio.sfxVolume * 0.3
    })
    
    this.audio.horn = new Howl({
      src: ['https://trae-api-cn.mchost.guru/api/ide/v1/text_to_speech?text=horn%20sound&voice=default'],
      volume: this.audio.sfxVolume
    })
    
    this.audio.ambient = new Howl({
      src: ['https://trae-api-cn.mchost.guru/api/ide/v1/text_to_speech?text=ambient%20sound&voice=default'],
      loop: true,
      volume: this.audio.volume * 0.3
    })
    
    this.audio.jump = new Howl({
      src: ['https://trae-api-cn.mchost.guru/api/ide/v1/text_to_speech?text=jump%20sound&voice=default'],
      volume: this.audio.sfxVolume * 0.5
    })
    
    this.audio.boost = new Howl({
      src: ['https://trae-api-cn.mchost.guru/api/ide/v1/text_to_speech?text=boost%20sound&voice=default'],
      volume: this.audio.sfxVolume * 0.6
    })
    
    // Start background music and ambient sounds
    if (this.audio.enabled) {
      this.audio.bgm.play()
      this.audio.ambient.play()
    }
  }

  async loadTextures() {
    // Create loading progress element
    this.createLoadingUI()
    
    // Create texture loading promises
    const texturePromises = [
      this.loadTexture('grass', 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=grass%20texture%20seamless%20pattern%20green%20natural&image_size=square_hd'),
      this.loadTexture('road', 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=asphalt%20road%20texture%20seamless%20pattern%20gray&image_size=square_hd'),
      this.loadTexture('building', 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=building%20facade%20texture%20seamless%20pattern%20modern&image_size=square_hd'),
      this.loadTexture('roof', 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=building%20roof%20texture%20seamless%20pattern&image_size=square_hd')
    ]
    
    // Wait for all textures to load
    await Promise.all(texturePromises)
    
    // Remove loading UI
    this.removeLoadingUI()
  }

  createLoadingUI() {
    // Create loading container
    this.loadingContainer = document.createElement('div')
    this.loadingContainer.style.position = 'fixed'
    this.loadingContainer.style.top = '0'
    this.loadingContainer.style.left = '0'
    this.loadingContainer.style.width = '100%'
    this.loadingContainer.style.height = '100%'
    this.loadingContainer.style.background = 'rgba(0, 0, 0, 0.9)'
    this.loadingContainer.style.display = 'flex'
    this.loadingContainer.style.flexDirection = 'column'
    this.loadingContainer.style.justifyContent = 'center'
    this.loadingContainer.style.alignItems = 'center'
    this.loadingContainer.style.zIndex = '9999'
    this.loadingContainer.innerHTML = `
      <h1 style="color: white; font-family: Arial, sans-serif; margin-bottom: 30px;">Loading...</h1>
      <div style="width: 300px; height: 20px; background: rgba(255, 255, 255, 0.2); border-radius: 10px; overflow: hidden;">
        <div id="loading-bar" style="width: 0%; height: 100%; background: #4CAF50; transition: width 0.3s ease;"></div>
      </div>
      <p id="loading-text" style="color: white; font-family: Arial, sans-serif; margin-top: 20px;">0%</p>
    `
    document.body.appendChild(this.loadingContainer)
  }

  removeLoadingUI() {
    if (this.loadingContainer) {
      this.loadingContainer.style.opacity = '0'
      this.loadingContainer.style.transition = 'opacity 0.5s ease'
      setTimeout(() => {
        if (this.loadingContainer && this.loadingContainer.parentNode) {
          this.loadingContainer.parentNode.removeChild(this.loadingContainer)
        }
      }, 500)
    }
  }

  loadTexture(name, url) {
    return new Promise((resolve) => {
      this.textureLoader.load(url, (texture) => {
        // Apply texture optimization
        this.optimizeTexture(texture)
        this.textures.set(name, texture)
        
        // Update loading progress
        this.updateLoadingProgress()
        resolve()
      }, (progressEvent) => {
        // Update loading progress during load
        if (progressEvent.lengthComputable) {
          const progress = (progressEvent.loaded / progressEvent.total) * 100
          console.log(`Loading ${name}: ${Math.round(progress)}%`)
        }
      })
    })
  }

  // Preload resources for faster access
  preloadResources() {
    // Preload audio files
    const audioFiles = [
      'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_speech?text=background%20music&voice=default',
      'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_speech?text=engine%20sound&voice=default',
      'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_speech?text=horn%20sound&voice=default',
      'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_speech?text=ambient%20sound&voice=default',
      'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_speech?text=jump%20sound&voice=default',
      'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_speech?text=boost%20sound&voice=default'
    ]
    
    // Preload audio using Howler's preload feature
    audioFiles.forEach(url => {
      new Howl({ src: [url], preload: true })
    })
  }

  optimizeTexture(texture) {
    // Enable texture compression if supported
    if (typeof texture.encoding !== 'undefined') {
      texture.encoding = THREE.sRGBEncoding
    }
    
    // Set wrapping mode
    texture.wrapS = THREE.RepeatWrapping
    texture.wrapT = THREE.RepeatWrapping
    texture.repeat.set(10, 10)
    
    // Generate mipmaps for better performance at different distances
    texture.generateMipmaps = true
    
    // Set anisotropy for better quality at angles
    if (this.renderer) {
      texture.anisotropy = Math.min(this.renderer.capabilities.getMaxAnisotropy(), 4)
    }
  }

  updateLoadingProgress() {
    if (!this.loadingContainer) return
    
    const loaded = this.textures.size
    const total = 4 // Total number of textures
    const progress = (loaded / total) * 100
    
    const loadingBar = document.getElementById('loading-bar')
    const loadingText = document.getElementById('loading-text')
    
    if (loadingBar) {
      loadingBar.style.width = `${progress}%`
    }
    if (loadingText) {
      loadingText.textContent = `${Math.round(progress)}%`
    }
  }

  async initPhysics() {
    await RAPIER.init()
    this.world = new RAPIER.World(new RAPIER.Vector3(0, -9.81, 0))
  }

  async initRenderer() {
    // Try WebGPU first, fall back to WebGL if not supported
    if (await THREE.WebGPURenderer.isAvailable()) {
      this.renderer = new THREE.WebGPURenderer({
        canvas: document.getElementById('canvas'),
        antialias: true
      })
      console.log('Using WebGPU renderer')
    } else {
      this.renderer = new THREE.WebGLRenderer({
        canvas: document.getElementById('canvas'),
        antialias: true
      })
      console.log('Using WebGL renderer')
    }
    
    // Set renderer properties
    this.renderer.setSize(window.innerWidth, window.innerHeight)
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.0
    this.renderer.outputEncoding = THREE.sRGBEncoding
    
    // Enable frustum culling
    this.renderer.localClippingEnabled = true
  }

  // Performance settings
  setupPerformanceSettings() {
    this.performance = {
      lodEnabled: true,
      instancingEnabled: true,
      shadowQuality: 'medium', // low, medium, high
      adaptiveQuality: true,
      currentFps: 60,
      targetFps: 60,
      qualityLevel: 1 // 0: low, 1: medium, 2: high
    }
  }

  setupLighting() {
    // Ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5)
    this.scene.add(ambientLight)
    
    // Directional light
    this.directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
    this.directionalLight.position.set(5, 10, 5)
    this.scene.add(this.directionalLight)
    
    // Add shadow support
    this.renderer.shadowMap.enabled = true
    this.updateShadowQuality()
  }

  updateShadowQuality() {
    if (!this.directionalLight) return
    
    const quality = this.performance.shadowQuality
    let mapSize = 1024
    let shadowType = THREE.PCFShadowMap
    
    switch (quality) {
      case 'low':
        mapSize = 512
        shadowType = THREE.BasicShadowMap
        break
      case 'medium':
        mapSize = 1024
        shadowType = THREE.PCFShadowMap
        break
      case 'high':
        mapSize = 2048
        shadowType = THREE.PCFSoftShadowMap
        break
    }
    
    this.renderer.shadowMap.type = shadowType
    this.directionalLight.castShadow = true
    this.directionalLight.shadow.mapSize.width = mapSize
    this.directionalLight.shadow.mapSize.height = mapSize
  }

  async loadScene() {
    // Create terrain with heightmap
    await this.createTerrain()
    
    // Create roads
    this.createRoads()
    
    // Create buildings
    this.createBuildings()
    
    // Create vehicle
    this.createVehicle()
    
    // Create POIs
    this.createPOIs()
    
    // Initialize info panel
    this.initInfoPanel()
    
    // Initialize map
    this.initMap()
  }

  async createTerrain() {
    // Create heightmap
    const size = 50 // Reduced size for better performance
    const heightScale = 5
    const heightmap = new Array(size * size)
    
    // Generate simple heightmap using Perlin noise
    for (let z = 0; z < size; z++) {
      for (let x = 0; x < size; x++) {
        const i = z * size + x
        const noiseX = x / size * 10
        const noiseZ = z / size * 10
        const height = Math.sin(noiseX) * Math.cos(noiseZ) * heightScale
        heightmap[i] = height
      }
    }
    
    // Create terrain geometry with LOD support
    if (this.performance.lodEnabled) {
      // Create LOD levels
      const lod = new THREE.LOD()
      
      // High detail (near)
      const highGeometry = new THREE.PlaneGeometry(200, 200, size - 1, size - 1)
      this.updateTerrainGeometry(highGeometry, heightmap, size)
      const highMaterial = new THREE.MeshStandardMaterial({
        map: this.textures.get('grass'),
        roughness: 0.8,
        metalness: 0.2
      })
      const highMesh = new THREE.Mesh(highGeometry, highMaterial)
      highMesh.rotation.x = -Math.PI / 2
      highMesh.receiveShadow = true
      lod.addLevel(highMesh, 0)
      
      // Medium detail (mid-range)
      const mediumGeometry = new THREE.PlaneGeometry(200, 200, size / 2 - 1, size / 2 - 1)
      this.updateTerrainGeometry(mediumGeometry, heightmap, size)
      const mediumMesh = new THREE.Mesh(mediumGeometry, highMaterial)
      mediumMesh.rotation.x = -Math.PI / 2
      mediumMesh.receiveShadow = true
      lod.addLevel(mediumMesh, 100)
      
      // Low detail (far)
      const lowGeometry = new THREE.PlaneGeometry(200, 200, size / 4 - 1, size / 4 - 1)
      this.updateTerrainGeometry(lowGeometry, heightmap, size)
      const lowMesh = new THREE.Mesh(lowGeometry, highMaterial)
      lowMesh.rotation.x = -Math.PI / 2
      lowMesh.receiveShadow = true
      lod.addLevel(lowMesh, 200)
      
      this.scene.add(lod)
    } else {
      // Single level terrain
      const geometry = new THREE.PlaneGeometry(200, 200, size - 1, size - 1)
      this.updateTerrainGeometry(geometry, heightmap, size)
      
      // Create terrain material
      const terrainMaterial = new THREE.MeshStandardMaterial({
        map: this.textures.get('grass'),
        roughness: 0.8,
        metalness: 0.2
      })
      
      // Create terrain mesh
      const terrain = new THREE.Mesh(geometry, terrainMaterial)
      terrain.rotation.x = -Math.PI / 2
      terrain.receiveShadow = true
      this.scene.add(terrain)
    }
    
    // Create physics body for the terrain
    const terrainBodyDesc = RAPIER.RigidBodyDesc.fixed()
    const terrainBody = this.world.createRigidBody(terrainBodyDesc)
    
    // Create collision shape for terrain (simplified as box)
    const terrainColliderDesc = RAPIER.ColliderDesc.cuboid(100, 5, 100)
    terrainColliderDesc.setTranslation(0, 0, 0)
    this.world.createCollider(terrainColliderDesc, terrainBody)
  }

  updateTerrainGeometry(geometry, heightmap, size) {
    const positions = geometry.attributes.position.array
    
    for (let i = 0; i < positions.length; i += 3) {
      const x = Math.floor(((positions[i] + 100) / 200) * size)
      const z = Math.floor(((positions[i + 2] + 100) / 200) * size)
      const clampedX = Math.max(0, Math.min(size - 1, x))
      const clampedZ = Math.max(0, Math.min(size - 1, z))
      const height = heightmap[clampedZ * size + clampedX]
      positions[i + 1] = height
    }
    
    geometry.attributes.position.needsUpdate = true
    geometry.computeVertexNormals()
  }

  createRoads() {
    // Create main road
    const roadGeometry = new THREE.PlaneGeometry(20, 100)
    const roadMaterial = new THREE.MeshStandardMaterial({
      map: this.textures.get('road'),
      roughness: 0.9,
      metalness: 0.1
    })
    
    const road = new THREE.Mesh(roadGeometry, roadMaterial)
    road.rotation.x = -Math.PI / 2
    road.position.y = 0.1
    road.receiveShadow = true
    this.scene.add(road)
    
    // Create crossroad
    const crossroadGeometry = new THREE.PlaneGeometry(100, 20)
    const crossroad = new THREE.Mesh(crossroadGeometry, roadMaterial)
    crossroad.rotation.x = -Math.PI / 2
    crossroad.position.y = 0.1
    crossroad.receiveShadow = true
    this.scene.add(crossroad)
    
    // Create road markings
    const markingGeometry = new THREE.PlaneGeometry(2, 100)
    const markingMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.9,
      metalness: 0.1
    })
    
    const marking1 = new THREE.Mesh(markingGeometry, markingMaterial)
    marking1.rotation.x = -Math.PI / 2
    marking1.position.set(0, 0.11, 0)
    this.scene.add(marking1)
    
    const marking2 = new THREE.Mesh(markingGeometry, markingMaterial)
    marking2.rotation.x = -Math.PI / 2
    marking2.rotation.z = Math.PI / 2
    marking2.position.set(0, 0.11, 0)
    this.scene.add(marking2)
  }

  createBuildings() {
    // Create building materials
    const buildingMaterial = new THREE.MeshStandardMaterial({ 
      map: this.textures.get('building'),
      roughness: 0.7, 
      metalness: 0.1 
    })
    
    // Create buildings
    const buildingPositions = [
      { x: -40, z: -40, width: 10, depth: 10, height: 15 },
      { x: 40, z: -40, width: 15, depth: 15, height: 20 },
      { x: -40, z: 40, width: 12, depth: 12, height: 18 },
      { x: 40, z: 40, width: 8, depth: 8, height: 12 }
    ]
    
    if (this.performance.instancingEnabled && buildingPositions.length > 1) {
      // Use instanced rendering for better performance
      const baseGeometry = new THREE.BoxGeometry(1, 1, 1) // Base geometry with unit size
      const instancedGeometry = new THREE.InstancedBufferGeometry().copy(baseGeometry)
      
      // Create instance matrix attribute
      const matrices = new Float32Array(buildingPositions.length * 16)
      
      buildingPositions.forEach((pos, index) => {
        const matrix = new THREE.Matrix4()
        matrix.makeScale(pos.width, pos.height, pos.depth)
        matrix.setPosition(pos.x, pos.height / 2, pos.z)
        matrix.toArray(matrices, index * 16)
        
        // Create physics body for building
        const buildingBodyDesc = RAPIER.RigidBodyDesc.fixed()
        const buildingBody = this.world.createRigidBody(buildingBodyDesc)
        const buildingColliderDesc = RAPIER.ColliderDesc.cuboid(pos.width / 2, pos.height / 2, pos.depth / 2)
        buildingColliderDesc.setTranslation(pos.x, pos.height / 2, pos.z)
        this.world.createCollider(buildingColliderDesc, buildingBody)
      })
      
      instancedGeometry.setAttribute('instMatrix', new THREE.InstancedBufferAttribute(matrices, 16))
      
      // Create instanced mesh
      const instancedMesh = new THREE.InstancedMesh(instancedGeometry, buildingMaterial, buildingPositions.length)
      instancedMesh.castShadow = true
      instancedMesh.receiveShadow = true
      this.scene.add(instancedMesh)
    } else {
      // Fallback to individual meshes
      buildingPositions.forEach((pos, index) => {
        const geometry = new THREE.BoxGeometry(pos.width, pos.height, pos.depth)
        const building = new THREE.Mesh(geometry, buildingMaterial)
        building.position.set(pos.x, pos.height / 2, pos.z)
        building.castShadow = true
        building.receiveShadow = true
        this.scene.add(building)
        
        // Create physics body for building
        const buildingBodyDesc = RAPIER.RigidBodyDesc.fixed()
        const buildingBody = this.world.createRigidBody(buildingBodyDesc)
        const buildingColliderDesc = RAPIER.ColliderDesc.cuboid(pos.width / 2, pos.height / 2, pos.depth / 2)
        buildingColliderDesc.setTranslation(pos.x, pos.height / 2, pos.z)
        this.world.createCollider(buildingColliderDesc, buildingBody)
      })
    }
  }

  createVehicle() {
    // Vehicle dimensions
    const width = 1.5
    const length = 3
    const height = 1
    
    // Create vehicle mesh
    const vehicleGeometry = new THREE.BoxGeometry(width, height, length)
    const vehicleMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xff0000,
      metalness: 0.3,
      roughness: 0.4
    })
    this.vehicle = new THREE.Mesh(vehicleGeometry, vehicleMaterial)
    this.vehicle.position.y = 0.5
    this.vehicle.castShadow = true
    this.vehicle.receiveShadow = true
    this.scene.add(this.vehicle)
    
    // Create physics body for the vehicle
    const vehicleBodyDesc = RAPIER.RigidBodyDesc.dynamic()
    vehicleBodyDesc.setMass(1000) // 1000kg
    this.vehicleBody = this.world.createRigidBody(vehicleBodyDesc)
    const vehicleColliderDesc = RAPIER.ColliderDesc.cuboid(width/2, height/2, length/2)
    vehicleColliderDesc.setMass(1000)
    this.world.createCollider(vehicleColliderDesc, this.vehicleBody)
    
    // Store object with its physics body
    this.objects.set(this.vehicle, this.vehicleBody)
  }

  setupEventListeners() {
    // Handle window resize
    window.addEventListener('resize', this.handleResize.bind(this))
    
    // Handle keyboard events
    window.addEventListener('keydown', (e) => {
      this.keys[e.key.toLowerCase()] = true
      this.updateControlsFromKeyboard(e, true)
    })
    
    window.addEventListener('keyup', (e) => {
      this.keys[e.key.toLowerCase()] = false
      this.updateControlsFromKeyboard(e, false)
    })
    
    // Handle mouse events for camera control
    window.addEventListener('mousedown', this.handleMouseDown.bind(this))
    window.addEventListener('mousemove', this.handleMouseMove.bind(this))
    window.addEventListener('mouseup', this.handleMouseUp.bind(this))
    
    // Handle touch events
    window.addEventListener('touchstart', this.handleTouchStart.bind(this))
    window.addEventListener('touchmove', this.handleTouchMove.bind(this))
    window.addEventListener('touchend', this.handleTouchEnd.bind(this))
    
    // Handle gamepad events
    window.addEventListener('gamepadconnected', this.handleGamepadConnected.bind(this))
    window.addEventListener('gamepaddisconnected', this.handleGamepadDisconnected.bind(this))
    
    // Start gamepad polling
    this.pollGamepad()
    
    // UI control events
    this.setupUIControls()
    
    // Mobile control events
    this.setupMobileControls()
  }

  setupUIControls() {
    // Panel toggle
    const panelToggle = document.getElementById('panel-toggle')
    const panelContent = document.getElementById('panel-content')
    if (panelToggle && panelContent) {
      panelToggle.addEventListener('click', () => {
        panelContent.classList.toggle('collapsed')
        panelToggle.textContent = panelContent.classList.contains('collapsed') ? '▶' : '▼'
      })
    }
    
    // Tab switching
    const tabButtons = document.querySelectorAll('.tab-button')
    tabButtons.forEach(button => {
      button.addEventListener('click', () => {
        // Remove active class from all tabs
        tabButtons.forEach(btn => btn.classList.remove('active'))
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'))
        
        // Add active class to clicked tab
        button.classList.add('active')
        const tabId = button.getAttribute('data-tab')
        document.getElementById(`${tabId}-tab`).classList.add('active')
      })
    })
    
    // Audio controls
    this.setupAudioControls()
    
    // Graphics controls
    this.setupGraphicsControls()
  }
  
  setupAudioControls() {
    // Audio toggle button
    const audioToggle = document.getElementById('audio-toggle')
    if (audioToggle) {
      audioToggle.addEventListener('click', () => {
        this.audio.enabled = !this.audio.enabled
        audioToggle.textContent = this.audio.enabled ? 'On' : 'Off'
        
        if (this.audio.enabled) {
          // Resume all audio
          this.audio.bgm.play()
          this.audio.ambient.play()
          if (this.controls.forward) {
            this.audio.engine.play()
          }
          if (this.controls.boost) {
            this.audio.boost.play()
          }
        } else {
          // Pause all audio
          this.audio.bgm.pause()
          this.audio.ambient.pause()
          this.audio.engine.pause()
          this.audio.boost.pause()
        }
      })
    }
    
    // Master volume slider
    const masterVolume = document.getElementById('master-volume')
    if (masterVolume) {
      masterVolume.addEventListener('input', (e) => {
        this.audio.volume = parseFloat(e.target.value)
        this.audio.bgm.volume(this.audio.volume * 0.5)
        this.audio.ambient.volume(this.audio.volume * 0.3)
      })
    }
    
    // SFX volume slider
    const sfxVolume = document.getElementById('sfx-volume')
    if (sfxVolume) {
      sfxVolume.addEventListener('input', (e) => {
        this.audio.sfxVolume = parseFloat(e.target.value)
        this.audio.engine.volume(this.audio.sfxVolume * 0.3)
        this.audio.horn.volume(this.audio.sfxVolume)
        this.audio.jump.volume(this.audio.sfxVolume * 0.5)
        this.audio.boost.volume(this.audio.sfxVolume * 0.6)
      })
    }
    
    // BGM volume slider
    const bgmVolume = document.getElementById('bgm-volume')
    if (bgmVolume) {
      bgmVolume.addEventListener('input', (e) => {
        const bgmVol = parseFloat(e.target.value)
        this.audio.bgm.volume(bgmVol * 0.5)
        this.audio.ambient.volume(bgmVol * 0.3)
      })
    }
  }
  
  setupGraphicsControls() {
    // Quality setting
    const qualitySelect = document.getElementById('quality')
    if (qualitySelect) {
      qualitySelect.addEventListener('change', (e) => {
        const quality = e.target.value
        // Implement quality changes here
        console.log('Quality set to:', quality)
      })
    }
    
    // Renderer setting
    const rendererSelect = document.getElementById('renderer')
    if (rendererSelect) {
      rendererSelect.addEventListener('change', (e) => {
        const renderer = e.target.value
        // Implement renderer changes here
        console.log('Renderer set to:', renderer)
      })
    }
    
    // Shadows toggle
    const shadowsToggle = document.getElementById('shadows-toggle')
    if (shadowsToggle) {
      shadowsToggle.addEventListener('click', () => {
        const currentText = shadowsToggle.textContent
        const newState = currentText === 'On' ? 'Off' : 'On'
        shadowsToggle.textContent = newState
        // Implement shadows toggle here
        console.log('Shadows set to:', newState)
      })
    }
    
    // Anti-aliasing toggle
    const aaToggle = document.getElementById('aa-toggle')
    if (aaToggle) {
      aaToggle.addEventListener('click', () => {
        const currentText = aaToggle.textContent
        const newState = currentText === 'On' ? 'Off' : 'On'
        aaToggle.textContent = newState
        // Implement anti-aliasing toggle here
        console.log('Anti-aliasing set to:', newState)
      })
    }
  }
  
  setupMobileControls() {
    // Mobile control buttons
    const controlButtons = document.querySelectorAll('.control-btn')
    controlButtons.forEach(button => {
      button.addEventListener('touchstart', (e) => {
        e.preventDefault()
        const control = button.getAttribute('data-control')
        this.handleMobileControl(control, true)
      })
      
      button.addEventListener('touchend', (e) => {
        e.preventDefault()
        const control = button.getAttribute('data-control')
        this.handleMobileControl(control, false)
      })
      
      // Also handle mouse events for testing
      button.addEventListener('mousedown', (e) => {
        e.preventDefault()
        const control = button.getAttribute('data-control')
        this.handleMobileControl(control, true)
      })
      
      button.addEventListener('mouseup', (e) => {
        e.preventDefault()
        const control = button.getAttribute('data-control')
        this.handleMobileControl(control, false)
      })
    })
  }
  
  handleMobileControl(control, pressed) {
    switch (control) {
      case 'forward':
        this.controls.forward = pressed
        break
      case 'backward':
        this.controls.backward = pressed
        break
      case 'left':
        this.controls.left = pressed
        break
      case 'right':
        this.controls.right = pressed
        break
      case 'boost':
        this.controls.boost = pressed
        break
      case 'jump':
        this.controls.jump = pressed
        break
      case 'interact':
        this.controls.interact = pressed
        break
      case 'map':
        if (pressed) {
          this.toggleMap()
        }
        break
    }
  }

  handleMouseDown(e) {
    this.isMouseDown = true
    this.lastMouseX = e.clientX
    this.lastMouseY = e.clientY
  }

  handleMouseMove(e) {
    if (this.isMouseDown) {
      const deltaX = e.clientX - this.lastMouseX
      const deltaY = e.clientY - this.lastMouseY
      
      // Update camera based on mouse movement
      this.handleCameraInput(deltaX, deltaY)
      
      this.lastMouseX = e.clientX
      this.lastMouseY = e.clientY
    }
  }

  handleMouseUp(e) {
    this.isMouseDown = false
  }
  
  updateControlsFromKeyboard(e, pressed) {
    const key = e.key.toLowerCase()
    switch (key) {
      case 'w':
      case 'arrowup':
        this.controls.forward = pressed
        break
      case 's':
      case 'arrowdown':
        this.controls.backward = pressed
        break
      case 'a':
      case 'arrowleft':
        this.controls.left = pressed
        break
      case 'd':
      case 'arrowright':
        this.controls.right = pressed
        break
      case 'shift':
        this.controls.boost = pressed
        break
      case ' ': // space
      case 'space':
        this.controls.jump = pressed
        break
      case 'enter':
      case 'e':
        this.controls.interact = pressed
        break
      case 'm':
        if (pressed) {
          this.toggleMap()
        }
        break
    }
  }
  
  handleTouchStart(e) {
    if (e.touches.length > 0) {
      const touch = e.touches[0]
      this.touchStartX = touch.clientX
      this.touchStartY = touch.clientY
      this.touchCurrentX = touch.clientX
      this.touchCurrentY = touch.clientY
    }
  }
  
  handleTouchMove(e) {
    if (e.touches.length > 0) {
      const touch = e.touches[0]
      this.touchCurrentX = touch.clientX
      this.touchCurrentY = touch.clientY
      
      // Calculate touch delta
      const deltaX = this.touchCurrentX - this.touchStartX
      const deltaY = this.touchCurrentY - this.touchStartY
      
      // Update controls based on touch input with better sensitivity
      const threshold = 15 // Reduced threshold for better responsiveness
      this.controls.left = deltaX < -threshold
      this.controls.right = deltaX > threshold
      this.controls.forward = deltaY < -threshold
      this.controls.backward = deltaY > threshold
    }
  }

  // Mobile-specific optimizations
  optimizeForMobile() {
    // Detect mobile devices
    this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    
    if (this.isMobile) {
      console.log('Mobile device detected, applying optimizations')
      
      // Reduce quality for mobile devices
      this.performance.qualityLevel = 0
      this.performance.shadowQuality = 'low'
      this.performance.instancingEnabled = true
      
      // Apply mobile-specific settings
      this.applyQualitySettings()
      
      // Create mobile control UI if not already present
      this.createMobileControls()
    }
  }

  // Create mobile control UI
  createMobileControls() {
    // Check if mobile controls already exist
    if (document.getElementById('mobile-controls')) return
    
    // Create mobile control container
    const mobileControls = document.createElement('div')
    mobileControls.id = 'mobile-controls'
    mobileControls.style.position = 'fixed'
    mobileControls.style.bottom = '20px'
    mobileControls.style.left = '0'
    mobileControls.style.right = '0'
    mobileControls.style.display = 'flex'
    mobileControls.style.justifyContent = 'space-between'
    mobileControls.style.padding = '0 20px'
    mobileControls.style.zIndex = '1000'
    
    // Left controls (steering)
    const leftControls = document.createElement('div')
    leftControls.style.display = 'flex'
    leftControls.style.gap = '10px'
    leftControls.innerHTML = `
      <button class="control-btn" data-control="left" style="width: 60px; height: 60px; border-radius: 50%; background: rgba(255, 255, 255, 0.2); color: white; border: none; font-size: 24px; display: flex; align-items: center; justify-content: center;">←</button>
      <button class="control-btn" data-control="right" style="width: 60px; height: 60px; border-radius: 50%; background: rgba(255, 255, 255, 0.2); color: white; border: none; font-size: 24px; display: flex; align-items: center; justify-content: center;">→</button>
    `
    
    // Right controls (acceleration, brake, boost)
    const rightControls = document.createElement('div')
    rightControls.style.display = 'flex'
    rightControls.style.gap = '10px'
    rightControls.innerHTML = `
      <button class="control-btn" data-control="jump" style="width: 60px; height: 60px; border-radius: 50%; background: rgba(255, 255, 255, 0.2); color: white; border: none; font-size: 18px; display: flex; align-items: center; justify-content: center;">↑</button>
      <button class="control-btn" data-control="forward" style="width: 60px; height: 60px; border-radius: 50%; background: rgba(0, 255, 0, 0.3); color: white; border: none; font-size: 18px; display: flex; align-items: center; justify-content: center;">G</button>
      <button class="control-btn" data-control="boost" style="width: 60px; height: 60px; border-radius: 50%; background: rgba(255, 255, 0, 0.3); color: white; border: none; font-size: 18px; display: flex; align-items: center; justify-content: center;">B</button>
    `
    
    mobileControls.appendChild(leftControls)
    mobileControls.appendChild(rightControls)
    document.body.appendChild(mobileControls)
    
    // Add event listeners for mobile controls
    this.setupMobileControls()
  }
  
  handleTouchEnd(e) {
    // Reset touch controls
    this.controls.forward = false
    this.controls.backward = false
    this.controls.left = false
    this.controls.right = false
    this.touchStartX = 0
    this.touchStartY = 0
    this.touchCurrentX = 0
    this.touchCurrentY = 0
  }
  
  handleGamepadConnected(e) {
    console.log('Gamepad connected:', e.gamepad)
    this.gamepad = e.gamepad
  }
  
  handleGamepadDisconnected(e) {
    console.log('Gamepad disconnected:', e.gamepad)
    if (this.gamepad && this.gamepad.index === e.gamepad.index) {
      this.gamepad = null
    }
  }
  
  pollGamepad() {
    if (navigator.getGamepads) {
      const gamepads = navigator.getGamepads()
      for (let i = 0; i < gamepads.length; i++) {
        if (gamepads[i]) {
          this.gamepad = gamepads[i]
          this.updateControlsFromGamepad()
          break
        }
      }
    }
    requestAnimationFrame(this.pollGamepad.bind(this))
  }
  
  updateControlsFromGamepad() {
    if (!this.gamepad) return
    
    // Update controls based on gamepad input
    this.controls.forward = this.gamepad.buttons[0].pressed || this.gamepad.axes[1] < -0.2
    this.controls.backward = this.gamepad.buttons[1].pressed || this.gamepad.axes[1] > 0.2
    this.controls.left = this.gamepad.buttons[2].pressed || this.gamepad.axes[0] < -0.2
    this.controls.right = this.gamepad.buttons[3].pressed || this.gamepad.axes[0] > 0.2
    this.controls.boost = this.gamepad.buttons[6].pressed // L2 button
    this.controls.jump = this.gamepad.buttons[7].pressed // R2 button
  }

  handleResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(window.innerWidth, window.innerHeight)
  }

  updateVehicle() {
    if (!this.vehicleBody) return
    
    // Vehicle parameters
    const maxSpeed = 20 // m/s
    const boostSpeed = 30 // m/s
    const acceleration = 2 // m/s²
    const boostAcceleration = 4 // m/s²
    const deceleration = 3 // m/s²
    const turnSpeed = 2 // rad/s
    const jumpForce = 1000 // N
    
    // Get current velocity
    const velocity = this.vehicleBody.linvel()
    const currentSpeed = Math.sqrt(velocity.x * velocity.x + velocity.z * velocity.z)
    
    // Get vehicle rotation
    const rotation = this.vehicleBody.rotation()
    const quaternion = new THREE.Quaternion(rotation.x, rotation.y, rotation.z, rotation.w)
    const direction = new THREE.Vector3(0, 0, 1).applyQuaternion(quaternion)
    
    // Determine if boost is active
    const isBoosting = this.controls.boost
    const currentMaxSpeed = isBoosting ? boostSpeed : maxSpeed
    const currentAcceleration = isBoosting ? boostAcceleration : acceleration
    
    // Handle acceleration
    if (this.controls.forward) {
      if (currentSpeed < currentMaxSpeed) {
        const force = direction.multiplyScalar(currentAcceleration * 100)
        this.vehicleBody.applyForce(new RAPIER.Vector3(force.x, 0, force.z))
      }
      
      // Play engine sound
      if (this.audio.enabled && !this.audio.engine.playing()) {
        this.audio.engine.play()
      }
      
      // Adjust engine sound volume based on speed
      if (this.audio.engine.playing()) {
        const engineVolume = Math.min(1, currentSpeed / maxSpeed) * this.audio.sfxVolume * 0.3
        this.audio.engine.volume(engineVolume)
      }
      
      // Play boost sound when boosting
      if (isBoosting && this.audio.enabled && !this.audio.boost.playing()) {
        this.audio.boost.play()
      }
    } else {
      // Stop engine sound when not accelerating
      if (this.audio.engine.playing()) {
        this.audio.engine.stop()
      }
      
      // Stop boost sound when not boosting
      if (this.audio.boost.playing()) {
        this.audio.boost.stop()
      }
    }
    
    // Handle deceleration
    if (this.controls.backward) {
      if (currentSpeed > 0) {
        const force = direction.multiplyScalar(-deceleration * 100)
        this.vehicleBody.applyForce(new RAPIER.Vector3(force.x, 0, force.z))
      }
    }
    
    // Handle steering
    if (this.controls.left) {
      this.vehicleBody.applyTorqueImpulse(new RAPIER.Vector3(0, -turnSpeed, 0))
    }
    
    if (this.controls.right) {
      this.vehicleBody.applyTorqueImpulse(new RAPIER.Vector3(0, turnSpeed, 0))
    }
    
    // Handle jump
    if (this.controls.jump) {
      // Check if vehicle is on the ground (simplified)
      if (velocity.y < 0.1 && velocity.y > -0.1) {
        this.vehicleBody.applyImpulse(new RAPIER.Vector3(0, jumpForce, 0))
        
        // Play jump sound
        if (this.audio.enabled) {
          this.audio.jump.play()
        }
      }
    }
  }

  updateCamera() {
    if (!this.vehicleBody) return
    
    // Get vehicle position and rotation
    const vehiclePos = this.vehicleBody.translation()
    const vehicleRot = this.vehicleBody.rotation()
    const vehicleQuaternion = new THREE.Quaternion(vehicleRot.x, vehicleRot.y, vehicleRot.z, vehicleRot.w)
    
    // Create a combined rotation for the camera (vehicle rotation + camera yaw)
    const cameraQuaternion = new THREE.Quaternion()
    const yawRotation = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), this.cameraSettings.yaw)
    cameraQuaternion.multiplyQuaternions(vehicleQuaternion, yawRotation)
    
    // Calculate camera target position (behind and above the vehicle)
    const cameraOffset = new THREE.Vector3(0, this.cameraSettings.height, -this.cameraSettings.distance)
    
    // Apply combined rotation to the camera offset
    const rotatedOffset = cameraOffset.applyQuaternion(cameraQuaternion)
    
    // Calculate desired camera position
    const desiredPosition = new THREE.Vector3(
      vehiclePos.x + rotatedOffset.x,
      vehiclePos.y + rotatedOffset.y,
      vehiclePos.z + rotatedOffset.z
    )
    
    // Check for camera collisions
    const collisionPosition = this.checkCameraCollision(desiredPosition, vehiclePos)
    
    // Smoothly interpolate camera position
    this.camera.position.x += (collisionPosition.x - this.camera.position.x) * this.cameraSettings.smoothness
    this.camera.position.y += (collisionPosition.y - this.camera.position.y) * this.cameraSettings.smoothness
    this.camera.position.z += (collisionPosition.z - this.camera.position.z) * this.cameraSettings.smoothness
    
    // Calculate camera direction
    this.cameraDirection.subVectors(new THREE.Vector3(vehiclePos.x, vehiclePos.y + 1, vehiclePos.z), this.camera.position).normalize()
    
    // Smoothly rotate camera to look at the vehicle
    const targetLookAt = new THREE.Vector3(vehiclePos.x, vehiclePos.y + 1, vehiclePos.z)
    this.camera.lookAt(targetLookAt)
  }

  checkCameraCollision(desiredPosition, vehiclePosition) {
    // Create a ray from vehicle to desired camera position
    const rayDirection = new THREE.Vector3()
    rayDirection.subVectors(desiredPosition, vehiclePosition).normalize()
    
    // Calculate distance between vehicle and desired camera position
    const distance = vehiclePosition.distanceTo(desiredPosition)
    
    // Create ray for collision detection
    const rayOrigin = new RAPIER.Vector3(vehiclePosition.x, vehiclePosition.y + 1, vehiclePosition.z)
    const rayDir = new RAPIER.Vector3(rayDirection.x, rayDirection.y, rayDirection.z)
    
    // Perform raycast using Rapier physics engine
    const raycastResult = this.world.castRay(
      rayOrigin,
      rayDir,
      distance,
      true, // solid
      undefined, // group
      undefined  // filter
    )
    
    // If collision detected, adjust camera position
    if (raycastResult) {
      // Get collision point
      const collisionPoint = raycastResult.hitPoint()
      
      // Create a new position slightly before the collision point
      const adjustedPosition = new THREE.Vector3(
        collisionPoint.x - rayDirection.x * this.cameraSettings.collisionRadius,
        collisionPoint.y - rayDirection.y * this.cameraSettings.collisionRadius,
        collisionPoint.z - rayDirection.z * this.cameraSettings.collisionRadius
      )
      
      return adjustedPosition
    }
    
    // Return the desired position if no collision
    return desiredPosition
  }

  handleCameraInput(deltaX, deltaY) {
    // Adjust camera pitch and yaw based on input
    this.cameraSettings.pitch = Math.max(this.cameraSettings.minPitch, Math.min(this.cameraSettings.maxPitch, this.cameraSettings.pitch - deltaY * 0.01))
    this.cameraSettings.yaw += deltaX * 0.01
  }

  update() {
    // Update physics
    this.world.step()
    
    // Update objects from physics bodies
    for (const [object, body] of this.objects.entries()) {
      const position = body.translation()
      const rotation = body.rotation()
      object.position.set(position.x, position.y, position.z)
      object.quaternion.set(rotation.x, rotation.y, rotation.z, rotation.w)
    }
    
    // Update vehicle
    this.updateVehicle()
    
    // Update camera
    this.updateCamera()
  }

  render() {
    this.renderer.render(this.scene, this.camera)
  }

  animate() {
    const currentTime = performance.now()
    this.frameCount++
    
    if (currentTime - this.lastTime >= 1000) {
      this.fps = this.frameCount
      this.frameCount = 0
      this.lastTime = currentTime
      
      // Update performance metrics
      this.performance.currentFps = this.fps
      
      // Auto-adjust quality based on performance
      if (this.performance.adaptiveQuality) {
        this.adjustQualityBasedOnPerformance()
      }
      
      // Log performance metrics
      this.logPerformanceMetrics()
    }
    
    this.update()
    this.render()
    this.animationId = requestAnimationFrame(this.animate.bind(this))
  }

  // Adjust quality based on current performance
  adjustQualityBasedOnPerformance() {
    const currentFps = this.performance.currentFps
    const targetFps = this.performance.targetFps
    
    // If FPS is below target, reduce quality
    if (currentFps < targetFps - 10) {
      this.decreaseQuality()
    }
    // If FPS is well above target, increase quality
    else if (currentFps > targetFps + 10) {
      this.increaseQuality()
    }
  }

  // Decrease quality to improve performance
  decreaseQuality() {
    const currentLevel = this.performance.qualityLevel
    if (currentLevel > 0) {
      this.performance.qualityLevel = currentLevel - 1
      this.applyQualitySettings()
      console.log(`Decreased quality level to ${this.performance.qualityLevel}`)
    }
  }

  // Increase quality when performance allows
  increaseQuality() {
    const currentLevel = this.performance.qualityLevel
    if (currentLevel < 2) {
      this.performance.qualityLevel = currentLevel + 1
      this.applyQualitySettings()
      console.log(`Increased quality level to ${this.performance.qualityLevel}`)
    }
  }

  // Apply quality settings based on current level
  applyQualitySettings() {
    const level = this.performance.qualityLevel
    
    switch (level) {
      case 0: // Low quality
        this.performance.shadowQuality = 'low'
        this.performance.lodEnabled = true
        this.performance.instancingEnabled = true
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1))
        break
      case 1: // Medium quality
        this.performance.shadowQuality = 'medium'
        this.performance.lodEnabled = true
        this.performance.instancingEnabled = true
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5))
        break
      case 2: // High quality
        this.performance.shadowQuality = 'high'
        this.performance.lodEnabled = true
        this.performance.instancingEnabled = true
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
        break
    }
    
    // Update shadow quality
    this.updateShadowQuality()
  }

  // Log performance metrics
  logPerformanceMetrics() {
    console.log(`Performance Metrics:`)
    console.log(`- FPS: ${this.performance.currentFps}`)
    console.log(`- Quality Level: ${this.performance.qualityLevel}`)
    console.log(`- Shadow Quality: ${this.performance.shadowQuality}`)
    console.log(`- LOD Enabled: ${this.performance.lodEnabled}`)
    console.log(`- Instancing Enabled: ${this.performance.instancingEnabled}`)
  }

  // Create performance monitoring UI
  createPerformanceUI() {
    // Create performance panel
    this.performancePanel = document.createElement('div')
    this.performancePanel.style.position = 'fixed'
    this.performancePanel.style.top = '10px'
    this.performancePanel.style.right = '10px'
    this.performancePanel.style.background = 'rgba(0, 0, 0, 0.8)'
    this.performancePanel.style.color = 'white'
    this.performancePanel.style.padding = '10px'
    this.performancePanel.style.borderRadius = '5px'
    this.performancePanel.style.fontFamily = 'Arial, sans-serif'
    this.performancePanel.style.fontSize = '12px'
    this.performancePanel.style.zIndex = '1000'
    this.performancePanel.style.minWidth = '150px'
    this.performancePanel.id = 'performance-panel'
    this.performancePanel.innerHTML = `
      <div style="font-weight: bold; margin-bottom: 5px;">Performance</div>
      <div>FPS: <span id="fps-display">60</span></div>
      <div>Quality: <span id="quality-display">Medium</span></div>
      <div>Shadow: <span id="shadow-display">Medium</span></div>
      <button id="toggle-performance" style="margin-top: 10px; background: rgba(255, 255, 255, 0.2); color: white; border: none; padding: 5px; border-radius: 3px; cursor: pointer; font-size: 10px;">Toggle</button>
    `
    document.body.appendChild(this.performancePanel)
    
    // Add toggle functionality
    const toggleButton = document.getElementById('toggle-performance')
    if (toggleButton) {
      toggleButton.addEventListener('click', () => {
        this.performancePanel.style.display = this.performancePanel.style.display === 'none' ? 'block' : 'none'
      })
    }
  }

  // Update performance UI
  updatePerformanceUI() {
    if (!this.performancePanel) return
    
    const fpsDisplay = document.getElementById('fps-display')
    const qualityDisplay = document.getElementById('quality-display')
    const shadowDisplay = document.getElementById('shadow-display')
    
    if (fpsDisplay) {
      fpsDisplay.textContent = this.performance.currentFps
    }
    
    if (qualityDisplay) {
      const qualityLevels = ['Low', 'Medium', 'High']
      qualityDisplay.textContent = qualityLevels[this.performance.qualityLevel]
    }
    
    if (shadowDisplay) {
      shadowDisplay.textContent = this.performance.shadowQuality
    }
  }

  startAnimation() {
    this.animate()
  }

  createPOIs() {
    // POI data based on Bruno Simon's portfolio
    const poiData = [
      {
        name: 'Home',
        description: 'Welcome to my portfolio! I\'m Bruno Simon, a creative developer specializing in interactive 3D experiences for the web. This is my digital world where you can explore my work and learn more about me.',
        position: new THREE.Vector3(0, 1, 0),
        color: 0x00ff00
      },
      {
        name: 'About',
        description: 'My name is Bruno Simon, and I\'m a creative developer (mostly for the web). I love creating interactive 3D experiences and pushing the boundaries of what\'s possible on the web.',
        position: new THREE.Vector3(-30, 1, -30),
        color: 0x0000ff
      },
      {
        name: 'Projects',
        description: 'Explore my portfolio of interactive 3D projects and web applications. Each project represents a unique challenge and creative solution.',
        position: new THREE.Vector3(30, 1, -30),
        color: 0xffff00
      },
      {
        name: 'Skills',
        description: 'My technical skills include Three.js, WebGL, JavaScript, HTML5, CSS3, and creative coding. I specialize in creating immersive digital experiences.',
        position: new THREE.Vector3(30, 1, 30),
        color: 0xff00ff
      },
      {
        name: 'Contact',
        description: 'Get in touch with me for collaborations and projects. I\'m always open to new opportunities and creative challenges.',
        position: new THREE.Vector3(-30, 1, 30),
        color: 0xff0000
      }
    ]

    // Create POI objects
    poiData.forEach(data => {
      // Create POI marker
      const geometry = new THREE.SphereGeometry(0.5, 16, 16)
      const material = new THREE.MeshStandardMaterial({ 
        color: data.color,
        emissive: data.color,
        emissiveIntensity: 0.5,
        transparent: true,
        opacity: 0.8
      })
      const marker = new THREE.Mesh(geometry, material)
      marker.position.copy(data.position)
      marker.castShadow = true
      this.scene.add(marker)

      // Create POI data object
      const poi = {
        marker,
        name: data.name,
        description: data.description,
        position: data.position,
        color: data.color
      }

      this.pois.push(poi)
    })
  }

  initInfoPanel() {
    // Create info panel element
    const panel = document.createElement('div')
    panel.id = 'info-panel'
    panel.style.position = 'fixed'
    panel.style.bottom = '20px'
    panel.style.left = '50%'
    panel.style.transform = 'translateX(-50%)'
    panel.style.background = 'rgba(0, 0, 0, 0.9)'
    panel.style.color = 'white'
    panel.style.padding = '30px'
    panel.style.borderRadius = '15px'
    panel.style.fontFamily = 'Arial, sans-serif'
    panel.style.zIndex = '1000'
    panel.style.minWidth = '300px'
    panel.style.maxWidth = '600px'
    panel.style.display = 'none'
    panel.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.3)'
    panel.style.backdropFilter = 'blur(10px)'
    panel.style.border = '1px solid rgba(255, 255, 255, 0.1)'
    panel.style.transition = 'all 0.3s ease'
    panel.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px;">
        <h2 id="poi-title" style="margin: 0; font-size: 24px; font-weight: bold;"></h2>
        <button id="close-info" style="background: none; border: none; color: white; font-size: 24px; cursor: pointer; padding: 0; line-height: 1;">&times;</button>
      </div>
      <div id="poi-content" style="margin-bottom: 25px;">
        <p id="poi-description" style="margin: 0; line-height: 1.6; font-size: 16px;"></p>
      </div>
      <div id="poi-actions" style="display: flex; gap: 10px;">
        <button id="poi-learn-more" style="background: #4CAF50; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; font-size: 14px; transition: background 0.3s;">Learn More</button>
        <button id="poi-close" style="background: rgba(255, 255, 255, 0.2); color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; font-size: 14px; transition: background 0.3s;">Close</button>
      </div>
    `
    document.body.appendChild(panel)

    // Store reference
    this.infoPanel = panel

    // Add event listeners
    const closeButton = document.getElementById('close-info')
    if (closeButton) {
      closeButton.addEventListener('click', () => {
        this.hideInfoPanel()
      })
    }

    const closeButton2 = document.getElementById('poi-close')
    if (closeButton2) {
      closeButton2.addEventListener('click', () => {
        this.hideInfoPanel()
      })
    }

    const learnMoreButton = document.getElementById('poi-learn-more')
    if (learnMoreButton) {
      learnMoreButton.addEventListener('click', () => {
        if (this.activePoi) {
          // Open relevant page based on POI
          switch (this.activePoi.name) {
            case 'About Me':
              window.open('https://bruno-simon.com', '_blank')
              break
            case 'Projects':
              window.open('https://bruno-simon.com', '_blank')
              break
            case 'Skills':
              window.open('https://bruno-simon.com', '_blank')
              break
            case 'Contact':
              window.open('https://bruno-simon.com', '_blank')
              break
          }
        }
      })
    }
  }

  showInfoPanel(poi) {
    if (!this.infoPanel) return

    // Update panel content
    document.getElementById('poi-title').textContent = poi.name
    document.getElementById('poi-description').textContent = poi.description

    // Add color accent based on POI color
    const titleElement = document.getElementById('poi-title')
    if (titleElement) {
      titleElement.style.color = `#${poi.color.toString(16).padStart(6, '0')}`
    }

    // Show panel with animation
    this.infoPanel.style.display = 'block'
    this.infoPanel.style.opacity = '0'
    this.infoPanel.style.transform = 'translateX(-50%) translateY(20px)'
    
    setTimeout(() => {
      this.infoPanel.style.opacity = '1'
      this.infoPanel.style.transform = 'translateX(-50%) translateY(0)'
    }, 10)

    this.activePoi = poi
  }

  hideInfoPanel() {
    if (!this.infoPanel) return

    // Hide panel with animation
    this.infoPanel.style.opacity = '0'
    this.infoPanel.style.transform = 'translateX(-50%) translateY(20px)'
    
    setTimeout(() => {
      this.infoPanel.style.display = 'none'
    }, 300)

    this.activePoi = null
  }

  initMap() {
    // Create map element
    const map = document.createElement('div')
    map.id = 'map'
    map.style.position = 'fixed'
    map.style.top = '20px'
    map.style.left = '20px'
    map.style.width = '300px'
    map.style.height = '300px'
    map.style.background = 'rgba(0, 0, 0, 0.8)'
    map.style.borderRadius = '10px'
    map.style.zIndex = '1000'
    map.style.display = 'none'
    map.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.3)'
    map.style.backdropFilter = 'blur(10px)'
    map.style.border = '1px solid rgba(255, 255, 255, 0.1)'
    map.style.padding = '10px'
    map.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
        <h3 style="margin: 0; color: white; font-size: 16px; font-family: Arial, sans-serif;">Map</h3>
        <button id="close-map" style="background: none; border: none; color: white; font-size: 18px; cursor: pointer; padding: 0;">&times;</button>
      </div>
      <div id="map-content" style="width: 100%; height: calc(100% - 40px); position: relative;">
        <div id="map-vehicle" style="position: absolute; width: 10px; height: 10px; background: #ff0000; border-radius: 50%; transform: translate(-50%, -50%); z-index: 10;"></div>
        <div id="map-pois" style="position: absolute; width: 100%; height: 100%;"></div>
      </div>
    `
    document.body.appendChild(map)

    // Store reference
    this.map = map

    // Add event listener for close button
    const closeButton = document.getElementById('close-map')
    if (closeButton) {
      closeButton.addEventListener('click', () => {
        this.toggleMap()
      })
    }

    // Create POI markers on map
    this.updateMapPOIs()
  }

  toggleMap() {
    if (!this.map) return

    this.mapVisible = !this.mapVisible
    this.map.style.display = this.mapVisible ? 'block' : 'none'
  }

  updateMapPOIs() {
    if (!this.map) return

    const poisContainer = document.getElementById('map-pois')
    if (!poisContainer) return

    // Clear existing markers
    poisContainer.innerHTML = ''

    // Add POI markers
    this.pois.forEach(poi => {
      const marker = document.createElement('div')
      marker.style.position = 'absolute'
      marker.style.width = '8px'
      marker.style.height = '8px'
      marker.style.borderRadius = '50%'
      marker.style.transform = 'translate(-50%, -50%)'
      marker.style.backgroundColor = `#${poi.color.toString(16).padStart(6, '0')}`
      marker.style.boxShadow = '0 0 10px rgba(255, 255, 255, 0.5)'
      marker.style.zIndex = '5'
      
      // Calculate map position (normalized to map size)
      const mapSize = 280 // map content size
      const worldSize = 200 // world size
      const x = (poi.position.x / worldSize) * mapSize + mapSize / 2
      const z = (poi.position.z / worldSize) * mapSize + mapSize / 2
      
      marker.style.left = `${x}px`
      marker.style.top = `${z}px`
      
      // Add tooltip
      marker.title = poi.name
      
      poisContainer.appendChild(marker)
    })
  }

  updateMap() {
    if (!this.map || !this.mapVisible || !this.vehicleBody) return

    const vehicleMarker = document.getElementById('map-vehicle')
    if (!vehicleMarker) return

    // Get vehicle position
    const vehiclePos = this.vehicleBody.translation()
    
    // Calculate map position (normalized to map size)
    const mapSize = 280 // map content size
    const worldSize = 200 // world size
    const x = (vehiclePos.x / worldSize) * mapSize + mapSize / 2
    const z = (vehiclePos.z / worldSize) * mapSize + mapSize / 2
    
    // Update marker position
    vehicleMarker.style.left = `${x}px`
    vehicleMarker.style.top = `${z}px`
  }

  checkPOIInteraction() {
    if (!this.vehicleBody || !this.controls.interact) return

    // Get vehicle position
    const vehiclePos = this.vehicleBody.translation()
    const vehiclePosition = new THREE.Vector3(vehiclePos.x, vehiclePos.y, vehiclePos.z)

    // Check distance to each POI
    for (const poi of this.pois) {
      const distance = vehiclePosition.distanceTo(poi.position)
      if (distance < 5) {
        this.showInfoPanel(poi)
        break
      }
    }

    // Reset interact control
    this.controls.interact = false
  }

  update() {
    // Update physics
    this.world.step()
    
    // Update objects from physics bodies
    for (const [object, body] of this.objects.entries()) {
      const position = body.translation()
      const rotation = body.rotation()
      object.position.set(position.x, position.y, position.z)
      object.quaternion.set(rotation.x, rotation.y, rotation.z, rotation.w)
    }
    
    // Update vehicle
    this.updateVehicle()
    
    // Update camera
    this.updateCamera()
    
    // Check POI interaction
    this.checkPOIInteraction()
    
    // Update map
    this.updateMap()
    
    // Update HUD
    this.updateHUD()
    
    // Update performance UI
    this.updatePerformanceUI()
  }
  
  updateHUD() {
    if (this.vehicleBody) {
      // Update speedometer
      const velocity = this.vehicleBody.linvel()
      const speed = Math.sqrt(velocity.x * velocity.x + velocity.z * velocity.z)
      const speedKmH = Math.round(speed * 3.6) // Convert m/s to km/h
      
      const speedometer = document.getElementById('speedometer')
      if (speedometer) {
        speedometer.textContent = `Speed: ${speedKmH} km/h`
      }
      
      // Update position
      const position = this.vehicleBody.translation()
      const positionElement = document.getElementById('position')
      if (positionElement) {
        const x = Math.round(position.x * 10) / 10
        const y = Math.round(position.y * 10) / 10
        const z = Math.round(position.z * 10) / 10
        positionElement.textContent = `Position: (${x}, ${y}, ${z})`
      }
    }
  }

  stopAnimation() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId)
      this.animationId = null
    }
  }
}

// Initialize the app
const app = new ThreeJSApp()
app.init()
