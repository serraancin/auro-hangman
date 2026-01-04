// ========== 3D BALLOON BUDDY RENDERER ==========
let scene, camera, renderer, balloonGroup;
let gallowsParts = [];
let bodyParts = [];
let isHangman3DInitialized = false;
let stars = [];
let pumpHandle, pumpRod; // For animation
let particles = []; // For particle effects
let cloudMaterials = []; // Store cloud materials for mood changes
let balloonMaterials = []; // Store balloon materials for color animation
let colorCycleTime = 0; // For color animation timing

// Timer variables
let timerInterval = null;
let timerSeconds = 0;
let timerEnabled = false;

// Difficulty setting
let currentDifficulty = 'medium';

// Soft pastel color palette for clean, appealing look
const pastelColors = {
    head: 0xFF8A80,   // Soft coral
    body: 0xA8E6CF,   // Soft mint
    arms: 0xDDA0DD,   // Soft lavender
    legs: 0xFFDAB9    // Soft peach
};

function initHangman3D() {
    const canvas = document.getElementById('hangman-3d');
    if (!canvas || isHangman3DInitialized) return;
    
    // Use container size instead of fixed size
    const container = canvas.parentElement;
    let width = container.clientWidth;
    let height = container.clientHeight;
    
    // Fallback if dimensions are 0 (e.g. if container is hidden or layout not ready)
    if (width === 0 || height === 0) {
        width = container.getBoundingClientRect().width || 500;
        height = container.getBoundingClientRect().height || 400;
    }
    
    // Scene setup - friendly sky gradient
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb); // Sky blue
    scene.fog = new THREE.Fog(0x87ceeb, 5, 20); // Soft fog for depth
    
    // Camera
    camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 0.5, 6.5); // Closer and more centered
    camera.lookAt(0, 0, 0);
    
    // Renderer
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true; // Enable shadows
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    
    // Handle window resize
    window.addEventListener('resize', onWindowResize, false);
    
    // Lighting
    const ambientLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.6); // Sky/Ground color mix
    scene.add(ambientLight);
    
    const sunLight = new THREE.DirectionalLight(0xfffacd, 1.2);
    sunLight.position.set(5, 10, 7);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 1024;
    sunLight.shadow.mapSize.height = 1024;
    scene.add(sunLight);
    
    const fillLight = new THREE.PointLight(0xffb6c1, 0.5, 20);
    fillLight.position.set(-3, 5, 5);
    scene.add(fillLight);
    
    // Create ground and scenery
    createScenery();
    
    // Create balloon buddy (hidden initially)
    createBalloonBuddy();
    
    // Add floating clouds
    createClouds();
    
    // Start animation loop
    animate();
    
    setupBalloonInteraction();
    
    isHangman3DInitialized = true;
    
    // Force a resize check after a short delay to ensure layout is settled
    setTimeout(onWindowResize, 100);
    setTimeout(onWindowResize, 500);
}

function onWindowResize() {
    const canvas = document.getElementById('hangman-3d');
    if (!canvas || !camera || !renderer) return;
    
    const container = canvas.parentElement;
    const width = container.clientWidth;
    const height = container.clientHeight;
    
    if (width === 0 || height === 0) return;
    
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
}

function createScenery() {
    // Grassy ground
    const groundMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x7ccd7c,
        roughness: 1,
        metalness: 0
    });
    // Circular ground looks better
    const groundGeom = new THREE.CylinderGeometry(6, 6, 0.5, 32);
    const ground = new THREE.Mesh(groundGeom, groundMaterial);
    ground.position.set(0, -2.7, 0);
    ground.receiveShadow = true;
    scene.add(ground);
    
    // Cute fence post (instead of gallows)
    const postMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xdeb887,
        roughness: 0.7
    });
    const postGeom = new THREE.CylinderGeometry(0.15, 0.18, 2.5);
    const post = new THREE.Mesh(postGeom, postMaterial);
    post.position.set(-1.5, -1.5, 0);
    post.castShadow = true;
    post.receiveShadow = true;
    scene.add(post);
    
    // Post top (rounded)
    const topGeom = new THREE.SphereGeometry(0.2, 12, 12);
    const top = new THREE.Mesh(topGeom, postMaterial);
    top.position.set(-1.5, -0.2, 0);
    top.castShadow = true;
    scene.add(top);
    
    // String holder hook
    const hookMaterial = new THREE.MeshStandardMaterial({ color: 0xffd700 });
    const hookGeom = new THREE.TorusGeometry(0.15, 0.03, 8, 16, Math.PI);
    const hook = new THREE.Mesh(hookGeom, hookMaterial);
    hook.position.set(-1.2, -0.1, 0);
    hook.rotation.z = -Math.PI / 2;
    hook.castShadow = true;
    scene.add(hook);

    // Air Pump (to explain why we are inflating a balloon)
    const pumpBaseGeom = new THREE.CylinderGeometry(0.4, 0.4, 0.2, 12);
    const pumpBaseMat = new THREE.MeshStandardMaterial({ color: 0x555555 });
    const pumpBase = new THREE.Mesh(pumpBaseGeom, pumpBaseMat);
    pumpBase.position.set(1.5, -2.4, 0);
    pumpBase.castShadow = true;
    pumpBase.receiveShadow = true;
    scene.add(pumpBase);

    const pumpCylGeom = new THREE.CylinderGeometry(0.15, 0.15, 1.2, 12);
    const pumpCylMat = new THREE.MeshStandardMaterial({ color: 0xff6b6b }); // Red pump
    const pumpCyl = new THREE.Mesh(pumpCylGeom, pumpCylMat);
    pumpCyl.position.set(1.5, -1.7, 0);
    pumpCyl.castShadow = true;
    scene.add(pumpCyl);
    
    // Pump Rod (moves up and down)
    const rodGeom = new THREE.CylinderGeometry(0.05, 0.05, 1.2, 8);
    const rodMat = new THREE.MeshStandardMaterial({ color: 0xcccccc });
    pumpRod = new THREE.Mesh(rodGeom, rodMat);
    pumpRod.position.set(1.5, -1.1, 0); // Initial position (up)
    pumpRod.castShadow = true;
    scene.add(pumpRod);
    
    // Pump Handle
    const handleGeom = new THREE.BoxGeometry(0.8, 0.1, 0.15);
    const handleMat = new THREE.MeshStandardMaterial({ color: 0x333333 });
    pumpHandle = new THREE.Mesh(handleGeom, handleMat);
    pumpHandle.position.set(0, 0.6, 0); // Relative to rod
    pumpRod.add(pumpHandle); // Attach to rod
    
    // Hose connecting pump to balloon area
    const hoseCurve = new THREE.CubicBezierCurve3(
        new THREE.Vector3(1.35, -2.3, 0),
        new THREE.Vector3(0.5, -2.3, 0),
        new THREE.Vector3(0.5, -2.5, 0),
        new THREE.Vector3(0, -2.5, 0) // Ends near balloon base
    );
    const hoseGeom = new THREE.TubeGeometry(hoseCurve, 20, 0.04, 8, false);
    const hoseMat = new THREE.MeshStandardMaterial({ color: 0x333333 });
    const hose = new THREE.Mesh(hoseGeom, hoseMat);
    hose.castShadow = true;
    scene.add(hose);
}

function createClouds() {
    // Big fluffy happy cartoon cloud material
    const cloudMaterial = new THREE.MeshPhysicalMaterial({ 
        color: 0xffffff,
        roughness: 1,
        metalness: 0,
        transparent: true,
        opacity: 0.98,
        emissive: 0xffffff,
        emissiveIntensity: 0.15, // Bright glow for happy feel
    });
    
    // Store reference for mood updates
    cloudMaterials.push(cloudMaterial);
    
    // Create big fluffy clouds
    for (let i = 0; i < 4; i++) {
        const cloudGroup = new THREE.Group();
        
        // More puffs for extra fluffy clouds
        const numPuffs = 10 + Math.floor(Math.random() * 6);
        const baseSize = 0.5 + Math.random() * 0.3; // Much bigger base size
        
        // Create main cloud body - big and puffy
        for (let j = 0; j < numPuffs; j++) {
            const size = baseSize * (0.5 + Math.random() * 0.7);
            const puffGeom = new THREE.SphereGeometry(size, 16, 16);
            const puff = new THREE.Mesh(puffGeom, cloudMaterial);
            
            // Distribute puffs in a wide cloud formation
            const angle = (j / numPuffs) * Math.PI * 2;
            const radius = 0.6 + Math.random() * 0.4;
            puff.position.set(
                Math.cos(angle) * radius + (Math.random() - 0.5) * 0.5,
                (Math.random() - 0.3) * 0.4,
                Math.sin(angle) * radius * 0.4 + (Math.random() - 0.5) * 0.3
            );
            
            // Random scale for variety
            const scaleVariation = 0.9 + Math.random() * 0.3;
            puff.scale.set(scaleVariation, scaleVariation * 0.85, scaleVariation);
            
            cloudGroup.add(puff);
        }
        
        // Add big central puffs for extra volume and roundness
        for (let k = 0; k < 5; k++) {
            const centerSize = baseSize * (0.9 + Math.random() * 0.5);
            const centerPuffGeom = new THREE.SphereGeometry(centerSize, 16, 16);
            const centerPuff = new THREE.Mesh(centerPuffGeom, cloudMaterial);
            centerPuff.position.set(
                (Math.random() - 0.5) * 0.6,
                Math.random() * 0.25 + 0.1, // Slightly higher for puffy top
                (Math.random() - 0.5) * 0.3
            );
            cloudGroup.add(centerPuff);
        }
        
        // Position clouds spread across the sky
        const xPos = -7 + i * 4.5 + (Math.random() - 0.5) * 1.5;
        const yPos = 2.0 + Math.random() * 0.8;
        const zPos = -4 - Math.random() * 2;
        cloudGroup.position.set(xPos, yPos, zPos);
        
        // Bigger scale for happy puffy clouds
        const cloudScale = 1.2 + Math.random() * 0.5;
        cloudGroup.scale.set(cloudScale, cloudScale * 0.75, cloudScale);
        
        // Gentle movement speeds
        cloudGroup.userData.speed = 0.004 + Math.random() * 0.003;
        cloudGroup.userData.bobSpeed = 0.3 + Math.random() * 0.3;
        cloudGroup.userData.bobOffset = Math.random() * Math.PI * 2;
        
        scene.add(cloudGroup);
        stars.push(cloudGroup);
    }
}

function createBalloonBuddy() {
    balloonGroup = new THREE.Group();
    balloonGroup.position.set(0, 0, 0);
    scene.add(balloonGroup);
    
    // Helper for ghost material
    const ghostOpacity = 0.15;
    
    // Helper to create soft, matte balloon material (cleaner look)
    const createBalloonMat = (color, isGhost = false, partType = 'body') => {
        const mat = new THREE.MeshPhysicalMaterial({ 
            color: color,
            roughness: 0.4,      // More matte for softer look
            metalness: 0.0,      // No metalness for cleaner appearance
            clearcoat: 0.3,      // Subtle shine
            clearcoatRoughness: 0.4,
            transparent: isGhost,
            opacity: isGhost ? ghostOpacity : 1,
            side: THREE.DoubleSide
        });
        mat.userData.partType = partType;
        mat.userData.baseColor = new THREE.Color(color);
        balloonMaterials.push(mat);
        return mat;
    };

    // === CLEANER, CUTER BALLOON DESIGN ===
    
    // Head balloon - soft coral pink (Part 0)
    const headMaterial = createBalloonMat(0xFF8A80, true, 'head'); // Soft coral
    const headGeom = new THREE.SphereGeometry(0.55, 32, 32);
    const head = new THREE.Mesh(headGeom, headMaterial);
    head.position.set(0, 1.1, 0);
    head.scale.set(1, 0.95, 0.9); // Slightly squished for cute look
    head.visible = true;
    head.userData.originalScale = new THREE.Vector3(1, 0.95, 0.9);
    head.castShadow = true;
    head.receiveShadow = true;
    balloonGroup.add(head);
    bodyParts.push(head);
    
    // Simple cute face - just dots for eyes (cleaner, less uncanny)
    const eyeMaterial = new THREE.MeshBasicMaterial({ color: 0x2d3436 });
    
    // Simple dot eyes (no whites - more cartoon-like)
    const eyeGeom = new THREE.SphereGeometry(0.06, 16, 16);
    const leftEye = new THREE.Mesh(eyeGeom, eyeMaterial);
    leftEye.position.set(-0.15, 0.08, 0.48);
    head.add(leftEye);
    
    const rightEye = new THREE.Mesh(eyeGeom, eyeMaterial);
    rightEye.position.set(0.15, 0.08, 0.48);
    head.add(rightEye);
    
    // Cute highlight dots on eyes (gives life without being creepy)
    const highlightMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const highlightGeom = new THREE.SphereGeometry(0.02, 8, 8);
    const leftHighlight = new THREE.Mesh(highlightGeom, highlightMat);
    leftHighlight.position.set(0.02, 0.02, 0.03);
    leftEye.add(leftHighlight);
    const rightHighlight = new THREE.Mesh(highlightGeom, highlightMat);
    rightHighlight.position.set(0.02, 0.02, 0.03);
    rightEye.add(rightHighlight);
    
    // Simple curved smile (thin and clean)
    const smileCurve = new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(-0.12, -0.08, 0.5),
        new THREE.Vector3(0, -0.15, 0.52),
        new THREE.Vector3(0.12, -0.08, 0.5)
    );
    const smileGeom = new THREE.TubeGeometry(smileCurve, 12, 0.018, 8, false);
    const smile = new THREE.Mesh(smileGeom, eyeMaterial);
    smile.name = 'smile';
    head.add(smile);
    
    // Store references for expressions
    balloonGroup.userData.leftEye = leftEye;
    balloonGroup.userData.rightEye = rightEye;
    balloonGroup.userData.smile = smile;
    
    // Body balloon - soft mint (Part 1)
    const bodyMaterial = createBalloonMat(0xA8E6CF, true, 'body'); // Soft mint green
    const bodyGeom = new THREE.SphereGeometry(0.42, 32, 32);
    const body = new THREE.Mesh(bodyGeom, bodyMaterial);
    body.position.set(0, 0.35, 0);
    body.scale.set(0.9, 1.1, 0.8);
    body.userData.originalScale = new THREE.Vector3(0.9, 1.1, 0.8);
    body.visible = true;
    body.castShadow = true;
    body.receiveShadow = true;
    balloonGroup.add(body);
    bodyParts.push(body);
    
    // Arms - soft lavender (Part 2 & 3)
    const armMaterial = createBalloonMat(0xDDA0DD, true, 'arms'); // Soft lavender
    const armGeom = new THREE.SphereGeometry(0.15, 24, 24);
    
    const leftArm = new THREE.Mesh(armGeom, armMaterial);
    leftArm.position.set(-0.5, 0.45, 0);
    leftArm.scale.set(1.2, 0.7, 0.7);
    leftArm.userData.originalScale = new THREE.Vector3(1.2, 0.7, 0.7);
    leftArm.visible = true;
    leftArm.castShadow = true;
    balloonGroup.add(leftArm);
    bodyParts.push(leftArm);
    
    // Right arm balloon - Part 3
    const rightArm = new THREE.Mesh(armGeom, armMaterial.clone());
    rightArm.position.set(0.5, 0.45, 0);
    rightArm.scale.set(1.2, 0.7, 0.7);
    rightArm.userData.originalScale = new THREE.Vector3(1.2, 0.7, 0.7);
    rightArm.visible = true;
    rightArm.castShadow = true;
    balloonGroup.add(rightArm);
    bodyParts.push(rightArm);
    
    // Legs - soft peach (Part 4 & 5)
    const legMaterial = createBalloonMat(0xFFDAB9, true, 'legs'); // Soft peach
    const legGeom = new THREE.SphereGeometry(0.13, 24, 24);
    
    const leftLeg = new THREE.Mesh(legGeom, legMaterial);
    leftLeg.position.set(-0.2, -0.25, 0);
    leftLeg.scale.set(0.7, 1.3, 0.7);
    leftLeg.userData.originalScale = new THREE.Vector3(0.7, 1.3, 0.7);
    leftLeg.visible = true;
    leftLeg.castShadow = true;
    balloonGroup.add(leftLeg);
    bodyParts.push(leftLeg);
    
    const rightLeg = new THREE.Mesh(legGeom, legMaterial.clone());
    rightLeg.position.set(0.2, -0.25, 0);
    rightLeg.scale.set(0.7, 1.3, 0.7);
    rightLeg.userData.originalScale = new THREE.Vector3(0.7, 1.3, 0.7);
    rightLeg.visible = true;
    rightLeg.castShadow = true;
    balloonGroup.add(rightLeg);
    bodyParts.push(rightLeg);
    
    // Balloon string (thin and simple)
    const stringMaterial = new THREE.MeshBasicMaterial({ color: 0xaaaaaa });
    const stringCurve = new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(0, -0.4, 0),
        new THREE.Vector3(-0.3, -0.8, 0),
        new THREE.Vector3(-0.8, -0.2, 0)
    );
    const stringGeom = new THREE.TubeGeometry(stringCurve, 20, 0.015, 6, false);
    const string = new THREE.Mesh(stringGeom, stringMaterial);
    balloonGroup.add(string);
}

function updateHangman3D(attemptsLeft) {
    if (!isHangman3DInitialized) return;
    
    // Calculate how many body parts to show (6 - attemptsLeft)
    const partsToShow = 6 - attemptsLeft;
    
    // Check if a new part is appearing (to trigger effects)
    let newPartAppeared = false;
    
    bodyParts.forEach((part, index) => {
        const shouldShow = index < partsToShow;
        
        if (shouldShow && part.material.transparent) {
            // Show part (make solid)
            part.material.transparent = false;
            part.material.opacity = 1;
            animatePartAppear(part);
            newPartAppeared = true;
            
            // Create poof effect at part position
            const worldPos = new THREE.Vector3();
            part.getWorldPosition(worldPos);
            createPoof(worldPos, part.material.color);
            
        } else if (!shouldShow && !part.material.transparent) {
            // Hide part (make ghost)
            part.material.transparent = true;
            part.material.opacity = 0.15;
            const orig = part.userData.originalScale;
            if (orig) part.scale.set(orig.x, orig.y, orig.z);
        }
    });
    
    // Trigger pump animation if a new part appeared
    if (newPartAppeared) {
        animatePump();
    }
    
    // Update balloon expression based on danger level
    updateBalloonExpression(attemptsLeft);
    
    // Update cloud mood (bright to dark based on lives)
    updateCloudMood(attemptsLeft);
    
    // Update sky color based on mood
    updateSkyMood(attemptsLeft);
    
    // If game over (0 attempts), balloon floats away sadly
    if (attemptsLeft === 0 && balloonGroup) {
        balloonGroup.userData.floatingAway = true;
    } else if (balloonGroup) {
        balloonGroup.userData.floatingAway = false;
        balloonGroup.position.y = 0;
        balloonGroup.rotation.z = 0;
    }
}

// Update clouds from bright white to dark gray based on remaining lives
function updateCloudMood(attemptsLeft) {
    if (cloudMaterials.length === 0) return;
    
    // Calculate mood: 6 lives = bright white, 0 lives = dark gray
    const moodPercent = attemptsLeft / 6;
    
    // Interpolate colors
    const brightColor = new THREE.Color(0xffffff); // Pure white
    const darkColor = new THREE.Color(0x4a4a5a);   // Dark stormy gray
    
    const currentColor = brightColor.clone().lerp(darkColor, 1 - moodPercent);
    
    // Emissive goes from bright to none
    const emissiveIntensity = moodPercent * 0.15;
    
    cloudMaterials.forEach(mat => {
        mat.color.copy(currentColor);
        mat.emissiveIntensity = emissiveIntensity;
        
        // Also darken the emissive color slightly when in danger
        if (moodPercent < 0.5) {
            mat.emissive.setHex(0x888899);
        } else {
            mat.emissive.setHex(0xffffff);
        }
    });
}

// Update sky background color based on mood
function updateSkyMood(attemptsLeft) {
    if (!scene) return;
    
    const moodPercent = attemptsLeft / 6;
    
    // Bright happy blue to stormy dark blue
    const happySky = new THREE.Color(0x87ceeb);    // Light sky blue
    const stormySky = new THREE.Color(0x2c3e50);   // Dark stormy blue
    
    const currentSky = happySky.clone().lerp(stormySky, 1 - moodPercent);
    
    scene.background = currentSky;
    
    // Update fog to match
    if (scene.fog) {
        scene.fog.color.copy(currentSky);
    }
}

// Update balloon facial expression based on remaining lives
function updateBalloonExpression(attemptsLeft) {
    if (!balloonGroup || !balloonGroup.userData.leftEye) return;
    
    const leftEye = balloonGroup.userData.leftEye;
    const rightEye = balloonGroup.userData.rightEye;
    
    if (attemptsLeft <= 2) {
        // Worried expression - eyes become smaller dots
        leftEye.scale.set(0.7, 0.7, 0.7);
        rightEye.scale.set(0.7, 0.7, 0.7);
        // Eyes look down slightly
        leftEye.position.y = 0.02;
        rightEye.position.y = 0.02;
    } else if (attemptsLeft <= 4) {
        // Nervous expression - slightly smaller
        leftEye.scale.set(0.85, 0.85, 0.85);
        rightEye.scale.set(0.85, 0.85, 0.85);
        leftEye.position.y = 0.06;
        rightEye.position.y = 0.06;
    } else {
        // Happy expression - normal cute dot eyes
        leftEye.scale.set(1, 1, 1);
        rightEye.scale.set(1, 1, 1);
        leftEye.position.y = 0.08;
        rightEye.position.y = 0.08;
    }
}

function animatePump() {
    if (!pumpRod) return;
    
    const startTime = Date.now();
    const duration = 500;
    const startY = -1.1; // Up position
    const endY = -1.6;   // Down position
    
    function pump() {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Go down then up
        if (progress < 0.5) {
            // Down phase
            const p = progress * 2;
            pumpRod.position.y = startY + (endY - startY) * Math.sin(p * Math.PI / 2);
        } else {
            // Up phase
            const p = (progress - 0.5) * 2;
            pumpRod.position.y = endY + (startY - endY) * Math.sin(p * Math.PI / 2);
        }
        
        if (progress < 1) {
            requestAnimationFrame(pump);
        } else {
            pumpRod.position.y = startY; // Reset
        }
    }
    pump();
}

function createPoof(position, color) {
    const particleCount = 8;
    const geometry = new THREE.SphereGeometry(0.05, 8, 8);
    const material = new THREE.MeshBasicMaterial({ color: color, transparent: true });
    
    for (let i = 0; i < particleCount; i++) {
        const particle = new THREE.Mesh(geometry, material.clone());
        particle.position.copy(position);
        
        // Random velocity
        particle.userData.velocity = new THREE.Vector3(
            (Math.random() - 0.5) * 0.1,
            (Math.random() - 0.5) * 0.1,
            (Math.random() - 0.5) * 0.1
        );
        
        scene.add(particle);
        particles.push({ mesh: particle, life: 1.0 });
    }
}

function animatePartAppear(part) {
    const startTime = Date.now();
    const duration = 400;
    const orig = part.userData.originalScale;
    
    // Start from zero
    part.scale.set(0.01, 0.01, 0.01);
    
    // Store original color for flash effect
    const originalColor = part.material.color.clone();
    const flashColor = new THREE.Color(0xffffff); // White flash
    
    function grow() {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Bouncy easing for balloon effect
        const bounce = 1 - Math.pow(2, -10 * progress) * Math.cos(progress * Math.PI * 3);
        
        if (orig) {
            part.scale.set(orig.x * bounce, orig.y * bounce, orig.z * bounce);
        } else {
            part.scale.set(bounce, bounce, bounce);
        }
        
        // Color flash effect - white burst that fades to original color
        const flashProgress = Math.min(progress * 2, 1); // Flash happens in first half
        part.material.color.copy(flashColor.clone().lerp(originalColor, flashProgress));
        
        // Extra emissive glow during appearance
        if (progress < 0.5) {
            part.material.emissive = flashColor.clone();
            part.material.emissiveIntensity = 0.3 * (1 - progress * 2);
        } else {
            part.material.emissiveIntensity = 0;
        }
        
        if (progress < 1) {
            requestAnimationFrame(grow);
        } else {
            // Reset emissive when done
            part.material.emissive = new THREE.Color(0x000000);
            part.material.emissiveIntensity = 0;
        }
    }
    grow();
}

function resetHangman3D() {
    bodyParts.forEach(part => {
        // Reset to ghost state
        part.material.transparent = true;
        part.material.opacity = 0.15;
        if (part.userData.originalScale) {
            part.scale.copy(part.userData.originalScale);
        }
    });
    if (balloonGroup) {
        balloonGroup.rotation.z = 0;
        balloonGroup.position.y = 0;
        balloonGroup.userData.floatingAway = false;
    }
}

let animationTime = 0;
function animate() {
    requestAnimationFrame(animate);
    animationTime += 0.02;
    colorCycleTime += 0.008; // Slow color cycle
    
    // Animate balloon colors with subtle iOS-style shimmer
    animateBalloonColors();
    
    // Gentle camera sway
    camera.position.x = Math.sin(animationTime * 0.3) * 0.2;
    camera.lookAt(0, 1, 0);
    
    // Animate clouds drifting with gentle bobbing
    stars.forEach(cloud => {
        cloud.position.x += cloud.userData.speed;
        if (cloud.position.x > 8) cloud.position.x = -8;
        
        // Add gentle vertical bobbing if cloud has bobSpeed
        if (cloud.userData.bobSpeed) {
            const bobAmount = Math.sin(animationTime * cloud.userData.bobSpeed + cloud.userData.bobOffset) * 0.05;
            cloud.position.y += bobAmount * 0.01;
        }
    });
    
    // Update particles
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life -= 0.02;
        
        if (p.life <= 0) {
            scene.remove(p.mesh);
            particles.splice(i, 1);
        } else {
            p.mesh.position.add(p.mesh.userData.velocity);
            p.mesh.material.opacity = p.life;
            p.mesh.scale.multiplyScalar(0.95); // Shrink
        }
    }
    
    // Balloon buddy gentle bobbing
    if (balloonGroup && !balloonGroup.userData.floatingAway) {
        balloonGroup.position.y = Math.sin(animationTime * 1.5) * 0.1;
        balloonGroup.rotation.z = Math.sin(animationTime * 0.8) * 0.05;
    }
    
    // Float away animation when game over
    if (balloonGroup && balloonGroup.userData.floatingAway) {
        balloonGroup.position.y += 0.02;
        balloonGroup.rotation.z = Math.sin(animationTime * 3) * 0.2;
        // Reset if floated too high
        if (balloonGroup.position.y > 5) {
            balloonGroup.position.y = 5;
        }
    }
    
    renderer.render(scene, camera);
}

// Animate balloon colors with very subtle gentle pulse (cleaner look)
function animateBalloonColors() {
    if (balloonMaterials.length === 0) return;
    
    balloonMaterials.forEach(mat => {
        if (!mat.userData.baseColor) return;
        
        const baseColor = mat.userData.baseColor;
        const hsl = { h: 0, s: 0, l: 0 };
        baseColor.getHSL(hsl);
        
        // Very subtle lightness pulse (soft breathing effect)
        const lightPulse = 0.02 * Math.sin(colorCycleTime * 1.5);
        
        mat.color.setHSL(
            hsl.h,
            hsl.s,
            Math.min(0.85, Math.max(0.5, hsl.l + lightPulse))
        );
    });
}

// Keep ASCII art as fallback
const hangmanStages = [
    `
  +---+
  |   |
  O   |
 /|\\  |
 / \\  |
      |
=========`,
    `
  +---+
  |   |
  O   |
 /|\\  |
 /    |
      |
=========`,
    `
  +---+
  |   |
  O   |
 /|\\  |
      |
      |
=========`,
    `
  +---+
  |   |
  O   |
 /|   |
      |
      |
=========`,
    `
  +---+
  |   |
  O   |
  |   |
      |
      |
=========`,
    `
  +---+
  |   |
  O   |
      |
      |
      |
=========`,
    `
  +---+
  |   |
      |
      |
      |
      |
=========`,
];

// Note: Index 6 is empty (start), Index 0 is full hangman (dead).
// attempts_left goes from 6 down to 0.
// So we can map attempts_left to the index directly if we reverse the array or just pick correctly.
// Let's map: 6 -> empty, 5 -> head, ..., 0 -> full body.
// Actually, let's just use a map function.

function getArt(attemptsLeft) {
    // 6 attempts left -> index 6 (empty)
    // 0 attempts left -> index 0 (full)
    return hangmanStages[attemptsLeft];
}

// ========== SOUND EFFECTS ==========
const AudioContext = window.AudioContext || window.webkitAudioContext;
let audioCtx = null;
let soundEnabled = true;

function initAudio() {
    if (!audioCtx) {
        audioCtx = new AudioContext();
    }
    return audioCtx;
}

function playSound(type) {
    if (!soundEnabled) return;
    
    try {
        const ctx = initAudio();
        if (ctx.state === 'suspended') ctx.resume();
        
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);
        
        switch(type) {
            case 'correct':
                // Pleasant ding - ascending tone
                oscillator.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
                oscillator.frequency.setValueAtTime(659.25, ctx.currentTime + 0.1); // E5
                oscillator.type = 'sine';
                gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
                gainNode.gain.exponentialDecayTo?.(0.01, ctx.currentTime + 0.3) || gainNode.gain.setValueAtTime(0.01, ctx.currentTime + 0.3);
                oscillator.start(ctx.currentTime);
                oscillator.stop(ctx.currentTime + 0.3);
                break;
                
            case 'wrong':
                // Buzzer - low dissonant tone
                oscillator.frequency.setValueAtTime(150, ctx.currentTime);
                oscillator.type = 'sawtooth';
                gainNode.gain.setValueAtTime(0.2, ctx.currentTime);
                gainNode.gain.setValueAtTime(0.01, ctx.currentTime + 0.2);
                oscillator.start(ctx.currentTime);
                oscillator.stop(ctx.currentTime + 0.2);
                break;
                
            case 'win':
                // Victory fanfare - ascending arpeggio
                const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
                notes.forEach((freq, i) => {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.connect(gain);
                    gain.connect(ctx.destination);
                    osc.frequency.value = freq;
                    osc.type = 'sine';
                    gain.gain.setValueAtTime(0.3, ctx.currentTime + i * 0.15);
                    gain.gain.setValueAtTime(0.01, ctx.currentTime + i * 0.15 + 0.3);
                    osc.start(ctx.currentTime + i * 0.15);
                    osc.stop(ctx.currentTime + i * 0.15 + 0.3);
                });
                return; // Early return since we handle this differently
                
            case 'lose':
                // Sad descending tone
                oscillator.frequency.setValueAtTime(400, ctx.currentTime);
                oscillator.frequency.setValueAtTime(300, ctx.currentTime + 0.2);
                oscillator.frequency.setValueAtTime(200, ctx.currentTime + 0.4);
                oscillator.type = 'sine';
                gainNode.gain.setValueAtTime(0.25, ctx.currentTime);
                gainNode.gain.setValueAtTime(0.01, ctx.currentTime + 0.6);
                oscillator.start(ctx.currentTime);
                oscillator.stop(ctx.currentTime + 0.6);
                break;
                
            case 'click':
                // Subtle click
                oscillator.frequency.setValueAtTime(800, ctx.currentTime);
                oscillator.type = 'sine';
                gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
                gainNode.gain.setValueAtTime(0.01, ctx.currentTime + 0.05);
                oscillator.start(ctx.currentTime);
                oscillator.stop(ctx.currentTime + 0.05);
                break;
        }
    } catch (e) {
        console.log('Audio not supported');
    }
}

function toggleSound() {
    soundEnabled = !soundEnabled;
    const btn = document.getElementById('sound-toggle');
    if (btn) {
        btn.textContent = soundEnabled ? '🔊' : '🔇';
        btn.title = soundEnabled ? 'Sound On' : 'Sound Off';
    }
    // Play a click to confirm if enabling
    if (soundEnabled) playSound('click');
}

// Voice and Speech Features
let voiceEnabled = false;
let recognition = null;
let isSpeaking = false;

function speak(text) {
    if (!window.speechSynthesis) return;
    
    // Cancel any ongoing speech
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.1; // Slightly higher pitch for a friendlier kid-friendly voice
    
    utterance.onstart = () => { isSpeaking = true; };
    utterance.onend = () => { isSpeaking = false; };
    
    window.speechSynthesis.speak(utterance);
}

function toggleVoice() {
    voiceEnabled = !voiceEnabled;
    const btn = document.getElementById('voice-toggle');
    
    if (voiceEnabled) {
        startVoiceRecognition();
        if (btn) {
            btn.classList.add('active');
            btn.title = "Voice On - Listening...";
        }
        speak("Voice recognition activated. You can say a letter or the whole word.");
    } else {
        stopVoiceRecognition();
        if (btn) {
            btn.classList.remove('active');
            btn.title = "Voice Off";
        }
        speak("Voice recognition deactivated.");
    }
}

function startVoiceRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        alert("Sorry, your browser doesn't support voice recognition.");
        voiceEnabled = false;
        return;
    }

    if (!recognition) {
        recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = false;
        recognition.lang = 'en-US';

        recognition.onresult = (event) => {
            const last = event.results.length - 1;
            const text = event.results[last][0].transcript.trim().toUpperCase();
            console.log('Recognized voice:', text);
            
            processVoiceInput(text);
        };

        recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            if (event.error === 'not-allowed') {
                alert("Microphone access denied. Please enable it in your browser settings.");
                toggleVoice();
            } else if (event.error === 'network') {
                console.log("Network error in speech recognition. Retrying...");
            } else if (event.error === 'no-speech') {
                // This is common, just ignore and let onend restart it
                console.log("No speech detected, restarting...");
            }
        };

        recognition.onend = () => {
            if (voiceEnabled) {
                // Small delay before restarting to prevent browser lock-up
                setTimeout(() => {
                    if (voiceEnabled) {
                        try {
                            recognition.start();
                        } catch (e) {
                            console.log("Failed to restart recognition:", e);
                        }
                    }
                }, 300);
            }
        };
    }

    try {
        recognition.start();
    } catch (e) {
        console.log("Recognition already started");
    }
}

function stopVoiceRecognition() {
    if (recognition) {
        recognition.stop();
    }
}

function processVoiceInput(text) {
    // Ignore voice input while the app is speaking to prevent self-triggering
    if (isSpeaking) return;

    const originalText = text;
    text = text.trim().toUpperCase();
    
    // Show a small visual feedback for what was heard
    showVoiceFeedback(originalText);

    // 1. Check if it's a single letter (e.g., "A", "B", "See")
    if (text.length === 1 && /^[A-Z]$/.test(text)) {
        makeGuess(text);
        return;
    }

    // 2. Handle common phonetic mistakes or word-based letters
    const phoneticMap = {
        'ALPHA': 'A', 'BEE': 'B', 'SEE': 'C', 'SEA': 'C', 'DELTA': 'D', 'ECHO': 'E', 
        'FOXTROT': 'F', 'GOLF': 'G', 'HOTEL': 'H', 'INDIA': 'I', 'EYE': 'I', 'JULIET': 'J', 
        'KILO': 'K', 'LIMA': 'L', 'MIKE': 'M', 'NOVEMBER': 'N', 'OSCAR': 'O', 'PAPA': 'P', 
        'QUEBEC': 'Q', 'ROMEO': 'R', 'ARE': 'R', 'SIERRA': 'S', 'TANGO': 'T', 'TEA': 'T', 
        'UNIFORM': 'U', 'YOU': 'U', 'VICTOR': 'V', 'WHISKEY': 'W', 'X-RAY': 'X', 'YANKEE': 'Y', 
        'WHY': 'Y', 'ZULU': 'Z', 'ZEE': 'Z', 'APPLE': 'A', 'BOY': 'B', 'CAT': 'C', 'DOG': 'D'
    };

    if (phoneticMap[text]) {
        makeGuess(phoneticMap[text]);
        return;
    }

    // 3. Extract letter from phrases like "Letter A" or "Guess B"
    const letterMatch = text.match(/(?:LETTER|GUESS|CHOOSE|IS IT|SAY)\s+([A-Z])/);
    if (letterMatch && letterMatch[1]) {
        makeGuess(letterMatch[1]);
        return;
    }

    // 4. Check if they said "Space"
    if (text.includes('SPACE')) {
        makeGuess(' ');
        return;
    }

    // 5. If they say "Hint", trigger AI hint
    if (text.includes("HINT")) {
        showAIHint();
        return;
    }
    
    // 6. If they say "New Game", start a new game
    if (text.includes("NEW GAME") || text.includes("RESTART")) {
        startNewGame();
        return;
    }
}

function showVoiceFeedback(text) {
    let feedbackEl = document.getElementById('voice-feedback');
    if (!feedbackEl) {
        feedbackEl = document.createElement('div');
        feedbackEl.id = 'voice-feedback';
        feedbackEl.style.cssText = `
            position: fixed;
            bottom: 100px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(108, 92, 231, 0.9);
            color: white;
            padding: 8px 20px;
            border-radius: 20px;
            font-size: 0.9rem;
            z-index: 1000;
            pointer-events: none;
            transition: opacity 0.3s;
            box-shadow: 0 4px 15px rgba(0,0,0,0.2);
        `;
        document.body.appendChild(feedbackEl);
    }
    
    feedbackEl.textContent = `🎤 Heard: "${text}"`;
    feedbackEl.style.opacity = '1';
    
    if (window.voiceFeedbackTimeout) clearTimeout(window.voiceFeedbackTimeout);
    window.voiceFeedbackTimeout = setTimeout(() => {
        feedbackEl.style.opacity = '0';
    }, 2000);
}

let currentMode = 'random';
let lastGameData = null;
let currentLearningInfo = null;

// Category themes configuration
const categoryThemes = {
    'Technology': {
        icon: '💻',
        themeClass: 'theme-technology',
        bgImage: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=1920&q=80'
    },
    'Animals': {
        icon: '🦁',
        themeClass: 'theme-animals',
        bgImage: 'https://images.unsplash.com/photo-1564349683136-77e08dba1ef7?w=1920&q=80'
    },
    'Fruits': {
        icon: '🍎',
        themeClass: 'theme-fruits',
        bgImage: 'https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=1920&q=80'
    },
    'Countries': {
        icon: '🌍',
        themeClass: 'theme-countries',
        bgImage: 'https://images.unsplash.com/photo-1526778548025-fa2f459cd5c1?w=1920&q=80'
    },
    'Science - Solar System': {
        icon: '🪐',
        themeClass: 'theme-science',
        bgImage: 'https://images.unsplash.com/photo-1454789548928-9efd52dc4031?w=1920&q=80'
    },
    'Science - Ecosystems': {
        icon: '🌿',
        themeClass: 'theme-science',
        bgImage: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1920&q=80'
    },
    'History - Ancient Civilizations': {
        icon: '🏛️',
        themeClass: 'theme-history',
        bgImage: 'https://images.unsplash.com/photo-1543357480-c60d40007a4d?w=1920&q=80'
    },
    'History - Civil Rights Movement': {
        icon: '✊',
        themeClass: 'theme-history',
        bgImage: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=1920&q=80'
    },
    'Custom': {
        icon: '✨',
        themeClass: 'theme-ai',
        bgImage: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=1920&q=80'
    },
    'default': {
        icon: '🎮',
        themeClass: '',
        bgImage: 'https://images.unsplash.com/photo-1557683316-973673baf926?w=1920&q=80'
    }
};

function updateCategoryTheme() {
    const select = document.getElementById('category-select');
    if (!select) return;
    
    let category = select.value;
    if (!category) return;
    
    // Handle AI-generated categories for theme matching
    let themeKey = category;
    if (category.startsWith('AI: ')) {
        themeKey = 'Custom';
    }
    
    const theme = categoryThemes[themeKey] || categoryThemes['default'];
    
    // Show/hide custom topic input
    const customContainer = document.getElementById('custom-topic-container');
    if (customContainer) {
        const isCustom = category === 'Custom';
        customContainer.style.display = isCustom ? 'flex' : 'none';
        
        if (isCustom) {
            const input = document.getElementById('custom-topic-input');
            if (input) {
                setTimeout(() => input.focus(), 100);
            }
        }
    }
    
    // Update icon
    const iconEl = document.getElementById('category-icon');
    if (iconEl) {
        iconEl.textContent = theme.icon;
        iconEl.style.animation = 'none';
        iconEl.offsetHeight; // Trigger reflow
        iconEl.style.animation = 'float 3s ease-in-out infinite';
    }
    
    // Update badge
    const badgeEl = document.getElementById('category-badge');
    if (badgeEl) {
        badgeEl.textContent = category || 'Random';
    }
    
    // Update background image with fade effect
    const bgImageEl = document.getElementById('bg-image');
    if (bgImageEl && theme.bgImage) {
        bgImageEl.classList.remove('active');
        setTimeout(() => {
            bgImageEl.style.backgroundImage = `url('${theme.bgImage}')`;
            bgImageEl.classList.add('active');
        }, 300);
    }
    
    // Update overlay theme
    const overlayEl = document.getElementById('bg-overlay');
    if (overlayEl) {
        // Remove all theme classes
        overlayEl.classList.remove('theme-technology', 'theme-animals', 'theme-fruits', 'theme-countries', 'theme-sports', 'theme-science', 'theme-history', 'theme-ai');
        if (theme.themeClass) {
            overlayEl.classList.add(theme.themeClass);
        }
    }
    
    // Update container theme
    const container = document.querySelector('.container');
    if (container) {
        container.classList.remove('theme-technology', 'theme-animals', 'theme-fruits', 'theme-countries', 'theme-sports', 'theme-science', 'theme-history', 'theme-ai');
        if (theme.themeClass) {
            container.classList.add(theme.themeClass);
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    createKeyboard();
    setupKeyboardInput(); // Enable physical keyboard
    initHangman3D(); // Initialize 3D hangman
    createFloatingParticles(); // Add floating particles
    initKidFriendlyFeatures(); // Add bubbles, bouncy keyboard, etc.
    fetchCategories().then(() => {
        const savedMode = localStorage.getItem('hangman_mode');
        // Apply initial theme
        updateCategoryTheme();
        
        if (savedMode === 'daily') {
            currentMode = 'daily';
            fetchDailyStatus();
        } else {
            currentMode = 'random';
            fetchStatus();
        }
    });
});

// ========== FLOATING PARTICLES ==========
function createFloatingParticles() {
    const container = document.getElementById('particles-container');
    if (!container) return;
    
    const colors = ['#ff6b6b', '#4ecdc4', '#ffe66d', '#95e1d3', '#a29bfe', '#fd79a8'];
    const particleCount = 20;
    
    for (let i = 0; i < particleCount; i++) {
        setTimeout(() => {
            createParticle(container, colors);
        }, i * 500); // Stagger creation
    }
    
    // Continuously create new particles
    setInterval(() => {
        if (container.children.length < particleCount) {
            createParticle(container, colors);
        }
    }, 2000);
}

function createParticle(container, colors) {
    const particle = document.createElement('div');
    particle.className = 'particle';
    
    const size = Math.random() * 15 + 5;
    const color = colors[Math.floor(Math.random() * colors.length)];
    const duration = Math.random() * 10 + 10;
    const left = Math.random() * 100;
    
    particle.style.cssText = `
        width: ${size}px;
        height: ${size}px;
        background: ${color};
        left: ${left}%;
        animation-duration: ${duration}s;
        animation-delay: ${Math.random() * 2}s;
    `;
    
    container.appendChild(particle);
    
    // Remove particle after animation
    setTimeout(() => {
        particle.remove();
    }, (duration + 2) * 1000);
}

async function fetchCategories() {
    const select = document.getElementById('category-select');
    if (!select) return;
    
    try {
        const response = await fetch('/api/categories');
        if (!response.ok) throw new Error('Network response was not ok');
        
        const categories = await response.json();
        
        // Clear existing options first
        select.innerHTML = '';
        
        if (categories && categories.length > 0) {
            categories.forEach(cat => {
                const option = document.createElement('option');
                option.value = cat;
                option.textContent = cat;
                select.appendChild(option);
            });
        } else {
            throw new Error('No categories returned');
        }
    } catch (error) {
        console.error('Error fetching categories:', error);
        // Fallback categories if API fails
        const fallbackCategories = [
            'Technology',
            'Animals',
            'Fruits',
            'Countries',
            'Science - Solar System',
            'Science - Ecosystems',
            'History - Ancient Civilizations',
            'History - Civil Rights Movement'
        ];
        select.innerHTML = '';
        fallbackCategories.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat;
            option.textContent = cat;
            select.appendChild(option);
        });
    } finally {
        // ALWAYS add Custom AI Topic option at the end if not already there
        const existingCustom = Array.from(select.options).find(opt => opt.value === 'Custom');
        if (!existingCustom) {
            const customOption = document.createElement('option');
            customOption.value = 'Custom';
            customOption.textContent = '✨ Custom AI Topic...';
            select.appendChild(customOption);
        }
    }
}

function createKeyboard() {
    const keyboard = document.getElementById('keyboard');
    keyboard.innerHTML = '';
    
    // Create A-Z buttons
    for (let i = 65; i <= 90; i++) {
        const letter = String.fromCharCode(i);
        const btn = document.createElement('button');
        btn.textContent = letter;
        btn.classList.add('key-btn');
        btn.id = `btn-${letter}`;
        btn.style.setProperty('--key-index', i - 65); // For staggered animation
        btn.onclick = () => makeGuess(letter);
        keyboard.appendChild(btn);
    }
    
    // Add Space button for multi-word phrases
    const spaceBtn = document.createElement('button');
    spaceBtn.textContent = 'SPACE';
    spaceBtn.classList.add('key-btn', 'space-btn');
    spaceBtn.id = 'btn-SPACE';
    spaceBtn.style.setProperty('--key-index', 26);
    spaceBtn.onclick = () => makeGuess(' ');
    keyboard.appendChild(spaceBtn);
}

// Physical keyboard support
function setupKeyboardInput() {
    document.addEventListener('keydown', (e) => {
        // Ignore if user is typing in an input field
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
            return;
        }
        
        const key = e.key.toUpperCase();
        
        // Check if it's a letter A-Z or Space
        if (/^[A-Z]$/.test(key)) {
            const btn = document.getElementById(`btn-${key}`);
            if (btn && !btn.disabled) {
                makeGuess(key);
            }
        } else if (e.key === ' ') {
            e.preventDefault(); // Prevent scrolling
            const btn = document.getElementById('btn-SPACE');
            if (btn && !btn.disabled) {
                makeGuess(' ');
            }
        }
    });
}

async function startNewGame() {
    const category = document.getElementById('category-select').value;
    const difficulty = document.getElementById('difficulty-select').value;
    const customTopic = document.getElementById('custom-topic-input').value;
    
    if (category === 'Custom' && !customTopic.trim()) {
        alert('Please enter a topic for the AI to generate words!');
        return;
    }

    currentDifficulty = difficulty;
    updateCategoryTheme(); // Update theme when starting new game
    
    // Reset and start timer if enabled
    if (timerEnabled) {
        startTimer();
    }
    
    try {
        const response = await fetch('/api/start', { 
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                category, 
                difficulty,
                custom_topic: customTopic
            })
        });
        
        if (!response.ok) {
            const err = await response.json();
            alert(err.error || 'Failed to start game');
            return;
        }

        const data = await response.json();
        currentMode = 'random';
        localStorage.setItem('hangman_mode', 'random');
        resetHintUI();
        updateUI(data);
        resetKeyboard();
        
        // If it was a custom game, update the badge to show the topic
        if (category === 'Custom') {
            const badgeEl = document.getElementById('category-badge');
            if (badgeEl) badgeEl.textContent = `AI: ${customTopic}`;
        }
    } catch (error) {
        console.error('Error starting game:', error);
    }
}

async function startDaily() {
    const category = document.getElementById('category-select').value;
    updateCategoryTheme(); // Update theme when starting daily
    try {
        const response = await fetch('/api/daily/start', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ category })
        });
        const data = await response.json();
        currentMode = 'daily';
        localStorage.setItem('hangman_mode', 'daily');
        resetHintUI();
        updateUI(data);
        resetKeyboard();
        updateKeyboard(data.guesses, data.masked_word);
    } catch (error) {
        console.error('Error starting daily:', error);
    }
}

function toggleLearningCard() {
    const content = document.getElementById('learning-content');
    const toggle = document.getElementById('learning-toggle');
    
    if (content.style.display === 'none') {
        content.style.display = 'block';
        toggle.textContent = '📚 Hide Curriculum Info';
    } else {
        content.style.display = 'none';
        toggle.textContent = '📚 Show Curriculum Info';
    }
}

function showHint() {
    const hintBtn = document.getElementById('hint-btn');
    const hintText = document.getElementById('hint-text');
    
    hintBtn.classList.add('used');
    hintBtn.textContent = '✓ Hint Shown';
    hintBtn.style.pointerEvents = 'none';
    hintText.style.display = 'block';
}

async function showAIHint() {
    const aiHintBtn = document.getElementById('ai-hint-btn');
    const aiHintText = document.getElementById('ai-hint-text');
    
    // If hint is already shown, toggle it off
    if (aiHintText.style.display === 'block' && aiHintText.textContent && !aiHintText.textContent.includes('Generating')) {
        aiHintText.style.display = 'none';
        aiHintBtn.textContent = '💡 Get AI Hint';
        aiHintBtn.disabled = false;
        return;
    }
    
    // Disable button and show loading state
    aiHintBtn.disabled = true;
    aiHintBtn.textContent = '🤔 Thinking...';
    aiHintText.textContent = 'Generating hint...';
    aiHintText.style.display = 'block';
    
    try {
        const response = await fetch('/api/ai-hint', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        const data = await response.json();
        
        if (data.success && data.hint) {
            aiHintText.textContent = data.hint;
            aiHintText.classList.add('hint-revealed');
            // Enable button so it can be clicked to hide
            aiHintBtn.disabled = false;
            aiHintBtn.textContent = '👁️ Hide Hint';
            
            if (voiceEnabled) {
                speak(`AI Hint: ${data.hint}`);
            }
        } else {
            aiHintText.textContent = `❌ ${data.error || 'Could not generate hint'}`;
            aiHintText.classList.add('hint-error');
            // Re-enable button on error
            aiHintBtn.disabled = false;
            aiHintBtn.textContent = '💡 Get AI Hint';
        }
    } catch (error) {
        console.error('Error fetching AI hint:', error);
        aiHintText.textContent = '❌ Failed to generate hint. Please try again.';
        aiHintText.classList.add('hint-error');
        // Re-enable button on error
        aiHintBtn.disabled = false;
        aiHintBtn.textContent = '💡 Get AI Hint';
    }
}

function resetHintUI() {
    const hintText = document.getElementById('hint-text');
    hintText.style.display = 'none'; // Keep hidden
    
    // Reset AI hint button
    const aiHintBtn = document.getElementById('ai-hint-btn');
    const aiHintText = document.getElementById('ai-hint-text');
    aiHintBtn.disabled = false;
    aiHintBtn.style.display = 'inline-block';
    aiHintBtn.textContent = '💡 Get AI Hint';
    aiHintText.style.display = 'none';
    aiHintText.textContent = '';
    aiHintText.classList.remove('hint-revealed', 'hint-error');
}

async function fetchStatus() {
    try {
        const response = await fetch('/api/status');
        const data = await response.json();
        currentMode = data.mode || 'random';
        updateUI(data);
        updateKeyboard(data.guesses, data.masked_word);
    } catch (error) {
        console.error('Error fetching status:', error);
    }
}

async function fetchDailyStatus() {
    const category = document.getElementById('category-select').value;
    try {
        const response = await fetch(`/api/daily/status?category=${encodeURIComponent(category)}`);
        const data = await response.json();
        currentMode = 'daily';
        updateUI(data);
        updateKeyboard(data.guesses, data.masked_word);
    } catch (error) {
        console.error('Error fetching daily status:', error);
    }
}

async function makeGuess(letter) {
    try {
        const category = document.getElementById('category-select').value;
        const endpoint = currentMode === 'daily' ? '/api/daily/guess' : '/api/guess';
        const payload = currentMode === 'daily' ? { letter, category } : { letter };
        
        // Store old masked word to detect changes
        const oldMaskedWord = document.getElementById('word-display').textContent;

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        
        if (!response.ok) {
            const err = await response.json();
            alert(err.error);
            return;
        }

        const data = await response.json();
        
        // Check if letter was correct (word changed)
        const isCorrect = data.masked_word.includes(letter);
        
        // Play sound effect
        if (data.game_over) {
            if (data.win) {
                playSound('win');
            } else {
                playSound('lose');
            }
        } else {
            playSound(isCorrect ? 'correct' : 'wrong');
        }
        
        // Trigger visual effects
        if (isCorrect) {
            triggerSuccessPulse();
        } else {
            triggerScreenShake();
        }
        
        // Animate letter reveals if correct
        if (isCorrect && !data.game_over) {
            animateLetterReveal(oldMaskedWord, data.masked_word, letter);
        } else {
            updateUI(data);
        }
        
        // Update the specific button immediately
        const btnId = letter === ' ' ? 'btn-SPACE' : `btn-${letter}`;
        const btn = document.getElementById(btnId);
        if (btn) {
            btn.disabled = true;
            if (isCorrect) {
                btn.classList.add('correct');
            } else {
                btn.classList.add('wrong');
            }
        }
        
        // If game over, still need to update UI fully
        if (data.game_over) {
            updateUI(data);
        }
        
    } catch (error) {
        console.error('Error guessing:', error);
    }
}

// Animate letters popping into place
function animateLetterReveal(oldWord, newWord, letter) {
    const display = document.getElementById('word-display');
    display.innerHTML = ''; // Clear current content
    
    const oldChars = oldWord.split(' ');
    const newChars = newWord.split(' ');
    
    newChars.forEach((char, index) => {
        const span = document.createElement('span');
        span.textContent = char + ' ';
        span.style.display = 'inline-block';
        
        // If this position changed from _ to the letter, animate it
        if (oldChars[index] === '_' && char === letter) {
            span.classList.add('letter-reveal');
        }
        
        display.appendChild(span);
    });
    
    // Update the rest of UI without touching word display
    // We need to manually update other elements
    setTimeout(() => {
        // Fetch fresh status to sync everything
        if (currentMode === 'daily') {
            fetchDailyStatus();
        } else {
            fetchStatus();
        }
    }, 600);
}

function updateLearningCard(info) {
    const card = document.getElementById('learning-card');
    if (!card) return;

    if (!info) {
        card.style.display = 'none';
        return;
    }

    card.style.display = 'block';
    const subjectText = [info.subject, info.grade_band].filter(Boolean).join(' • ');
    const standardText = info.standard ? `<strong>Standard:</strong> ${info.standard}` : '';
    const descriptionText = info.description ? info.description : '';
    const essentialText = info.essential_question ? `<strong>Think about:</strong> ${info.essential_question}` : '';

    const chip = document.getElementById('learning-chip');
    if (chip) {
        chip.textContent = subjectText || 'Curriculum Boost';
    }

    const subjectEl = document.getElementById('learning-subject');
    if (subjectEl) subjectEl.innerHTML = `<strong>${subjectText}</strong>`;

    const standardEl = document.getElementById('learning-standard');
    if (standardEl) standardEl.innerHTML = standardText;

    const descEl = document.getElementById('learning-description');
    if (descEl) descEl.textContent = descriptionText;

    const essentialEl = document.getElementById('learning-essential');
    if (essentialEl) essentialEl.innerHTML = essentialText;
    
    // Keep collapsed by default
    const content = document.getElementById('learning-content');
    if (content) content.style.display = 'none';
    const toggle = document.getElementById('learning-toggle');
    if (toggle) toggle.textContent = '📚 Show Curriculum Info';
}

function showCurriculumFact(info) {
    const container = document.getElementById('fun-fact-container');
    const textEl = document.getElementById('fun-fact-text');
    if (!container || !textEl) return;

    const segments = [];
    const speechSegments = [];
    
    if (info.definition) {
        segments.push(`<strong>Definition:</strong> ${info.definition}`);
        speechSegments.push(`Definition: ${info.definition}`);
    }
    if (info.fun_fact) {
        segments.push(`<strong>Fun fact:</strong> ${info.fun_fact}`);
        speechSegments.push(`Fun fact: ${info.fun_fact}`);
    }
    // Removed essential_question to save space

    textEl.innerHTML = segments.join('<br>');
    container.style.display = 'block';
    
    // Speak the fact if voice is enabled
    if (voiceEnabled) {
        speak(speechSegments.join('. '));
    }
}

function updateUI(data) {
    lastGameData = data;

    document.getElementById('word-display').textContent = data.masked_word;
    document.getElementById('attempts-left').textContent = data.attempts_left;
    
    // Update heart-based health bar
    updateHealthBar(data.attempts_left);
    
    // Update 3D container glow based on danger level
    updateDangerGlow(data.attempts_left);
    
    // Update 3D hangman (or fallback to ASCII art)
    if (isHangman3DInitialized) {
        updateHangman3D(data.attempts_left);
    } else {
        const artEl = document.getElementById('hangman-art');
        if (artEl) artEl.textContent = getArt(data.attempts_left);
    }

    // Mode / date / streak
    const modeLabel = document.getElementById('mode-label');
    const dailyDate = document.getElementById('daily-date');
    const streakLabel = document.getElementById('streak-label');
    const copyBtn = document.getElementById('copy-results-btn');

    const mode = data.mode || currentMode || 'random';
    currentMode = mode;
    if (modeLabel) modeLabel.textContent = mode === 'daily' ? '📅 Daily Challenge' : '🎮 Random Play';
    if (dailyDate) dailyDate.textContent = mode === 'daily' ? `Date: ${data.date || ''}` : '';
    if (streakLabel) {
        const cur = data.streak_current ?? 0;
        const best = data.streak_best ?? 0;
        streakLabel.textContent = mode === 'daily' ? `Streak: ${cur} (Best: ${best})` : 'Play as many as you want!';
    }
    
    // Update category select if it doesn't match current game (e.g. on page reload)
    if (data.category) {
        const select = document.getElementById('category-select');
        
        // Check if the category exists in the dropdown
        let optionExists = Array.from(select.options).some(opt => opt.value === data.category);
        
        if (!optionExists) {
            // If it's an AI category, we might want to add it or map it to Custom
            if (data.category.startsWith('AI: ')) {
                const newOpt = document.createElement('option');
                newOpt.value = data.category;
                newOpt.textContent = '✨ ' + data.category;
                // Insert before "Custom" if possible
                const customOpt = Array.from(select.options).find(opt => opt.value === 'Custom');
                if (customOpt) {
                    select.insertBefore(newOpt, customOpt);
                } else {
                    select.appendChild(newOpt);
                }
            }
        }
        
        if (select.value !== data.category) {
            select.value = data.category;
        }
        // Update the category badge to match
        const badgeEl = document.getElementById('category-badge');
        if (badgeEl) {
            badgeEl.textContent = data.category;
        }
        // Update the theme
        updateCategoryTheme();
    }
    
    // Update difficulty select if provided
    if (data.difficulty) {
        const difficultySelect = document.getElementById('difficulty-select');
        if (difficultySelect && difficultySelect.value !== data.difficulty) {
            difficultySelect.value = data.difficulty;
            currentDifficulty = data.difficulty;
        }
    }

    const hintEl = document.getElementById('hint-text');
    if (hintEl && data.hint) {
        hintEl.textContent = `Hint: ${data.hint}`;
        if (voiceEnabled && !data.game_over && data.attempts_left === 6) {
            speak(`The category is ${data.category}. Here is your hint: ${data.hint}`);
        }
    }

    if (data.learning) {
        currentLearningInfo = data.learning;
        updateLearningCard(data.learning);
    } else {
        currentLearningInfo = null;
        updateLearningCard(null);
    }
    
    const messageEl = document.getElementById('message');
    if (data.game_over) {
        if (data.win) {
            messageEl.textContent = "You Won! 🎉";
            messageEl.style.color = "green";
            triggerWinConfetti();
            if (voiceEnabled) speak("You won! Great job!");
        } else {
            messageEl.textContent = `Game Over! The word was ${data.word}`;
            messageEl.style.color = "red";
            if (voiceEnabled) speak(`Game over. The word was ${data.word}. Better luck next time!`);
        }
        disableAllButtons();

        // Fetch fun fact
        if (data.word) {
            if (currentLearningInfo && (currentLearningInfo.definition || currentLearningInfo.fun_fact)) {
                showCurriculumFact(currentLearningInfo);
            } else {
                fetchFunFact(data.word.toLowerCase(), data.hint);
            }
        }

        if (copyBtn) {
            copyBtn.style.display = (mode === 'daily') ? 'inline-block' : 'none';
        }
    } else {
        messageEl.textContent = "";
        
        // Hide fun fact container if game is not over
        const ffContainer = document.getElementById('fun-fact-container');
        if (ffContainer) ffContainer.style.display = 'none';

        if (copyBtn) {
            copyBtn.style.display = 'none';
        }
    }
}

async function copyResults() {
    if (!lastGameData || lastGameData.mode !== 'daily') return;

    const wrongCount = Math.max(0, 6 - (lastGameData.attempts_left ?? 0));
    const category = lastGameData.category || document.getElementById('category-select').value;
    const day = lastGameData.date || '';

    // Generate Health Bar: 💔 for mistakes, ❤️ for remaining lives
    let healthBar = '';
    for (let i = 0; i < wrongCount; i++) {
        healthBar += '💔';
    }
    for (let i = 0; i < (6 - wrongCount); i++) {
        healthBar += '❤️';
    }
    
    if (!lastGameData.win) {
        healthBar += ' 💀';
    } else {
        healthBar += ' 🎉';
    }

    const text = [
        `Hangman Daily ${day}`,
        `Category: ${category}`,
        `${healthBar}`,
        `Streak: ${lastGameData.streak_current ?? 0}`,
        `Play: ${window.location.origin}`,
    ].join('\n');

    try {
        await navigator.clipboard.writeText(text);
        alert('Results copied to clipboard!');
    } catch {
        // Fallback
        window.prompt('Copy your results:', text);
    }
}

function updateKeyboard(guesses, maskedWord) {
    guesses.forEach(letter => {
        const btnId = letter === ' ' ? 'btn-SPACE' : `btn-${letter}`;
        const btn = document.getElementById(btnId);
        if (btn) {
            btn.disabled = true;
            if (maskedWord.includes(letter)) {
                btn.classList.add('correct');
            } else {
                btn.classList.add('wrong');
            }
        }
    });
}

function resetKeyboard() {
    const buttons = document.querySelectorAll('.key-btn');
    buttons.forEach(btn => {
        btn.disabled = false;
        btn.classList.remove('correct', 'wrong');
    });
    // Also reset 3D hangman
    resetHangman3D();
    // Reset health bar
    resetHealthBar();
    // Remove danger glow
    updateDangerGlow(6);
}

function disableAllButtons() {
    const buttons = document.querySelectorAll('.key-btn');
    buttons.forEach(btn => btn.disabled = true);
}

// ========== HEALTH BAR & VISUAL EFFECTS ==========
function updateHealthBar(attemptsLeft) {
    const healthBar = document.getElementById('health-bar');
    if (!healthBar) return;
    
    const hearts = healthBar.querySelectorAll('.heart');
    hearts.forEach((heart, index) => {
        if (index < attemptsLeft) {
            heart.textContent = '❤️';
            heart.classList.remove('lost');
            // Add danger pulse for last 2 hearts
            if (attemptsLeft <= 2) {
                heart.classList.add('danger');
            } else {
                heart.classList.remove('danger');
            }
        } else {
            heart.textContent = '💔';
            heart.classList.add('lost');
            heart.classList.remove('danger');
        }
    });
}

function resetHealthBar() {
    const healthBar = document.getElementById('health-bar');
    if (!healthBar) return;
    
    const hearts = healthBar.querySelectorAll('.heart');
    hearts.forEach(heart => {
        heart.textContent = '❤️';
        heart.classList.remove('lost', 'danger');
    });
    
    // Reset cloud and sky mood to happy state
    updateCloudMood(6);
    updateSkyMood(6);
}

function updateDangerGlow(attemptsLeft) {
    const container3d = document.querySelector('.hangman-3d-container');
    if (!container3d) return;
    
    container3d.classList.remove('glow-danger', 'glow-success');
    
    if (attemptsLeft <= 2 && attemptsLeft > 0) {
        container3d.classList.add('glow-danger');
    }
}

function triggerScreenShake() {
    const container = document.querySelector('.container');
    if (!container) return;
    
    container.classList.add('shake');
    setTimeout(() => {
        container.classList.remove('shake');
    }, 400);
}

function triggerSuccessPulse() {
    const container = document.querySelector('.hangman-3d-container');
    if (!container) return;
    
    container.classList.add('glow-success');
    setTimeout(() => {
        container.classList.remove('glow-success');
    }, 500);
    
    // Kid-friendly enhancements
    // Show sparkles around the 3D container
    const rect = container.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    createSparkles(centerX, centerY, 12);
    
    // Show encouraging message (30% chance to not overwhelm)
    if (Math.random() < 0.4) {
        showEncouragingMessage();
    }
    
    // Show star reward
    showStarReward(centerX + (Math.random() - 0.5) * 100, centerY);
}

function triggerWinConfetti() {
    // Trigger victory dance for balloon buddy
    triggerVictoryDance();
    
    // Show big encouraging message
    const popup = document.getElementById('encourage-popup');
    if (popup) {
        const winMessages = ["YOU WON! 🎉", "AMAZING! 🏆", "CHAMPION! 👑", "SUPERSTAR! ⭐", "GENIUS! 🧠"];
        popup.textContent = winMessages[Math.floor(Math.random() * winMessages.length)];
        popup.classList.remove('show');
        void popup.offsetWidth;
        popup.classList.add('show');
    }
    
    // Check if confetti is loaded, otherwise fail silently
    if (typeof confetti === 'function') {
        const duration = 3000;
        const animationEnd = Date.now() + duration;
        const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 2000 };

        const randomInRange = (min, max) => Math.random() * (max - min) + min;

        const interval = setInterval(function() {
            const timeLeft = animationEnd - Date.now();

            if (timeLeft <= 0) {
                return clearInterval(interval);
            }

            const particleCount = 50 * (timeLeft / duration);
            // since particles fall down, start a bit higher than random
            confetti(Object.assign({}, defaults, { particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } }));
            confetti(Object.assign({}, defaults, { particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } }));
        }, 250);
    }
}

// ========== FUN FACTS & DEFINITIONS ==========
async function fetchFunFact(word, fallbackHint) {
    const container = document.getElementById('fun-fact-container');
    const textEl = document.getElementById('fun-fact-text');
    
    if (!container || !textEl) return;
    
    console.log(`Fetching fact for: ${word}, Fallback: ${fallbackHint}`);

    container.style.display = 'none';
    textEl.textContent = 'Loading fun fact...';
    
    // Helper to show text
    const showFact = (text) => {
        textEl.textContent = text;
        container.style.display = 'block';
        if (voiceEnabled) {
            speak(text);
        }
    };

    try {
        const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
        if (!response.ok) throw new Error('Definition not found');
        
        const data = await response.json();
        let definition = null;
        
        if (data && data[0] && data[0].meanings) {
            for (const meaning of data[0].meanings) {
                if (meaning.definitions && meaning.definitions.length > 0) {
                    definition = meaning.definitions[0].definition;
                    break;
                }
            }
        }

        if (definition) {
            showFact(definition);
        } else {
            throw new Error('No definition found in data');
        }
    } catch (e) {
        console.log('Could not fetch definition', e);
        
        // Fallback: Use the hint
        if (fallbackHint) {
            showFact(`Did you know? ${fallbackHint}`);
        } else {
            // Last resort: try to get hint from DOM
            const domHint = document.getElementById('hint-text')?.textContent?.replace('Hint: ', '');
            if (domHint) {
                showFact(`Did you know? ${domHint}`);
            } else {
                container.style.display = 'none';
            }
        }
    }
}

// ========== INTERACTIVE BALLOON ==========
function setupBalloonInteraction() {
    const canvas = document.getElementById('hangman-3d');
    if (!canvas) return;

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    canvas.addEventListener('click', (event) => {
        // Calculate mouse position in normalized device coordinates
        const rect = canvas.getBoundingClientRect();
        mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        raycaster.setFromCamera(mouse, camera);

        // Check intersections with balloon parts
        if (balloonGroup) {
            const intersects = raycaster.intersectObjects(balloonGroup.children, true);
            if (intersects.length > 0) {
                wobbleBalloon();
                playSound('click'); // Reuse click sound for now
            }
        }
    });
}

function wobbleBalloon() {
    if (!balloonGroup || balloonGroup.userData.isWobbling) return;
    
    balloonGroup.userData.isWobbling = true;
    const startTime = Date.now();
    const duration = 500;
    
    function animateWobble() {
        const elapsed = Date.now() - startTime;
        const progress = elapsed / duration;
        
        if (progress >= 1) {
            balloonGroup.scale.set(1, 1, 1);
            balloonGroup.userData.isWobbling = false;
            return;
        }
        
        // Elastic wobble effect
        const amount = Math.sin(progress * Math.PI * 6) * 0.1 * (1 - progress);
        balloonGroup.scale.set(1 + amount, 1 - amount, 1 + amount);
        
        requestAnimationFrame(animateWobble);
    }
    animateWobble();
}

// ========== KID-FRIENDLY ENHANCEMENTS ==========

// Floating bubbles background
function createFloatingBubbles() {
    const container = document.getElementById('bubbles-container');
    if (!container) return;
    
    // Create initial bubbles
    for (let i = 0; i < 15; i++) {
        setTimeout(() => createBubble(container), i * 500);
    }
    
    // Keep creating bubbles
    setInterval(() => createBubble(container), 2000);
}

function createBubble(container) {
    const bubble = document.createElement('div');
    bubble.className = 'bubble';
    
    const size = 20 + Math.random() * 60;
    const left = Math.random() * 100;
    const duration = 8 + Math.random() * 12;
    const delay = Math.random() * 2;
    
    bubble.style.cssText = `
        width: ${size}px;
        height: ${size}px;
        left: ${left}%;
        animation-duration: ${duration}s;
        animation-delay: ${delay}s;
    `;
    
    container.appendChild(bubble);
    
    // Remove after animation
    setTimeout(() => {
        bubble.remove();
    }, (duration + delay) * 1000 + 100);
}

// Encouraging messages
const encouragingMessages = [
    "Great job! 🌟",
    "You're amazing! ✨",
    "Super smart! 🧠",
    "Fantastic! 🎉",
    "Way to go! 🚀",
    "Brilliant! 💫",
    "You rock! 🎸",
    "Awesome! 🌈",
    "Keep it up! 💪",
    "Wonderful! 🦋"
];

function showEncouragingMessage() {
    const popup = document.getElementById('encourage-popup');
    if (!popup) return;
    
    // Pick random message
    const message = encouragingMessages[Math.floor(Math.random() * encouragingMessages.length)];
    popup.textContent = message;
    
    // Remove and re-add class to restart animation
    popup.classList.remove('show');
    void popup.offsetWidth; // Force reflow
    popup.classList.add('show');
    
    // Remove class after animation
    setTimeout(() => {
        popup.classList.remove('show');
    }, 1500);
}

// Sparkle effects on correct guess
function createSparkles(x, y, count = 8) {
    const container = document.getElementById('sparkles-container');
    if (!container) return;
    
    for (let i = 0; i < count; i++) {
        const sparkle = document.createElement('div');
        sparkle.className = 'sparkle';
        
        // Random position around click point
        const angle = (i / count) * Math.PI * 2;
        const distance = 30 + Math.random() * 40;
        const sparkleX = x + Math.cos(angle) * distance;
        const sparkleY = y + Math.sin(angle) * distance;
        
        // Random colors
        const colors = ['#FFD700', '#FF6B6B', '#4ECDC4', '#A29BFE', '#FF9FF3', '#54A0FF'];
        const color = colors[Math.floor(Math.random() * colors.length)];
        
        sparkle.style.cssText = `
            left: ${sparkleX}px;
            top: ${sparkleY}px;
            --sparkle-color: ${color};
        `;
        
        sparkle.querySelector
        container.appendChild(sparkle);
        
        // Remove after animation
        setTimeout(() => sparkle.remove(), 800);
    }
}

// Star reward for correct guesses
function showStarReward(x, y) {
    const star = document.createElement('div');
    star.className = 'star-reward';
    star.textContent = '⭐';
    star.style.left = x + 'px';
    star.style.top = y + 'px';
    
    document.body.appendChild(star);
    
    setTimeout(() => star.remove(), 1500);
}

// Victory dance animation for balloon buddy
function triggerVictoryDance() {
    if (!balloonGroup) return;
    
    const canvas = document.getElementById('hangman-3d');
    if (canvas) {
        canvas.classList.add('victory-dance');
    }
    
    const startTime = Date.now();
    const duration = 3000;
    
    function dance() {
        const elapsed = Date.now() - startTime;
        if (elapsed > duration) {
            if (canvas) canvas.classList.remove('victory-dance');
            balloonGroup.rotation.z = 0;
            balloonGroup.position.x = 0;
            return;
        }
        
        const progress = elapsed / duration;
        
        // Happy bouncing
        balloonGroup.position.y = Math.abs(Math.sin(elapsed * 0.015)) * 0.5;
        
        // Side to side sway
        balloonGroup.position.x = Math.sin(elapsed * 0.01) * 0.3;
        
        // Spin
        balloonGroup.rotation.z = Math.sin(elapsed * 0.02) * 0.2;
        
        // Scale pulse
        const pulse = 1 + Math.sin(elapsed * 0.03) * 0.1;
        balloonGroup.scale.set(pulse, pulse, pulse);
        
        requestAnimationFrame(dance);
    }
    dance();
}

// Enhanced keyboard with animation indices
function setupBouncyKeyboard() {
    const keys = document.querySelectorAll('.key-btn');
    keys.forEach((key, index) => {
        key.style.setProperty('--key-index', index);
    });
}

// ========== TIMER FUNCTIONS ==========
function toggleTimerMode() {
    const timerToggle = document.getElementById('timer-toggle');
    const timerDisplay = document.getElementById('timer-display');
    
    timerEnabled = timerToggle.checked;
    
    if (timerEnabled) {
        timerDisplay.style.display = 'block';
        startTimer();
    } else {
        timerDisplay.style.display = 'none';
        stopTimer();
    }
}

function startTimer() {
    stopTimer(); // Clear any existing timer
    timerSeconds = 0;
    updateTimerDisplay();
    
    timerInterval = setInterval(() => {
        timerSeconds++;
        updateTimerDisplay();
    }, 1000);
}

function stopTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

function updateTimerDisplay() {
    const minutes = Math.floor(timerSeconds / 60);
    const seconds = timerSeconds % 60;
    const timerText = document.getElementById('timer-text');
    if (timerText) {
        timerText.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
}

function getTimerTime() {
    return timerSeconds;
}

// ========== DIFFICULTY FUNCTIONS ==========
function updateDifficulty() {
    const difficultySelect = document.getElementById('difficulty-select');
    currentDifficulty = difficultySelect.value;
}

// Initialize kid-friendly features
function initKidFriendlyFeatures() {
    createFloatingBubbles();
    setupBouncyKeyboard();
}
