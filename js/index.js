const canvas = document.querySelector('canvas')
const c = canvas.getContext('2d')

canvas.width = 1280
canvas.height = 768

c.fillStyle = 'white'                         // maak de rectangle wit
c.fillRect(0, 0, canvas.width, canvas.height) // dus teken rechthoek vanaf linker bovenhoek (0,0), l&b van canvas

const placementTilesData2D = []

for (let i = 0; i < placementTilesData.length; i+= 20) { // zet de placementstilesdata array om in een
  placementTilesData2D.push(placementTilesData.slice(i, i + 20)) // 2D array van 20 tiles per row
}

const placementTiles = []

placementTilesData2D.forEach((row, y) => {
  row.forEach((symbol, x) => {
    if (symbol === 14) {
        // add building placement tile here
        placementTiles.push(new PlacementTile({
          position: {
            x: x * 64,
            y: y * 64
          }
        }))
    } // if
  })
})

const image = new Image()     // laat ons een image element maken die we kunnen gebruiken in drawImage
image.onload = () => {        // wat wil je doen zodra image volledig is geladen
  animate()
} 
image.src = 'img/gameMap.png' // nu referencet dit een html image

const enemies = []

function spawnEnemies(spawnCount) {
  for (let i = 1; i <= spawnCount; i++) { // maak een array met 10 enemies
    const xOffset = i * 150
    enemies.push(
      new Enemy({
        position: { x: waypoints[0].x - xOffset, y: waypoints[0].y }
      })
    )
  }
}

const buildings = []
let activeTile = undefined // in principe nog niets toegewezen aan activeTile
let enemyCount = 3
let hearts = 10
let coins =  100
let gameOver = false
const explosions = []

spawnEnemies (enemyCount)

function animate() {         // maak enemy animatie
  if (gameOver) {
    return
  }

  const animationId = requestAnimationFrame(animate)    // infinite loop we roepen continu animate
  
  c.drawImage(image, 0, 0)    // teken background

  for (let i = enemies.length - 1; i >= 0; i--) {
    const enemy = enemies[i]
    enemy.update()

    if (enemy.position.x > canvas.width) {
      hearts -= 1   
      enemies.splice(i, 1)
      document.querySelector('#hearts').innerHTML = hearts    
      console.log(hearts)

      if (hearts === 0) {
        console.log('game over')
        gameOver = true
        cancelAnimationFrame(animationId)
        document.querySelector('#gameOver').style.display = 'flex' // select id (#id)
        return
      }
    }
  }

  for (let i = explosions.length - 1; i >= 0; i--) {
    const explosion = explosions[i]
    explosion.draw()
    explosion.update()

    if (explosion.frames.current >= explosion.frames.max - 1) {
      explosions.splice (i, 1)
    }
  }

  // tracking total amount of enemies
  if (enemies.length === 0) {
    enemyCount += 2
    spawnEnemies(enemyCount)
  }

  placementTiles.forEach(tile => {
    tile.update (mouse)
  })

  buildings.forEach ((building) => {
    building.update ()
    building.target = null // steeds target resetten
    const validEnemies = enemies.filter(enemy => {
      const xDifference = enemy.center.x - building.center.x // elke projectile heeft een enemy geassocieerd in de projectile klasse
      const yDifference = enemy.center.y - building.center.y // elke projectile heeft een enemy geassocieerd in de projectile klasse
      const distance = Math.hypot (xDifference, yDifference) // check for collision between projectile and building, vind distance tussen centers
      return distance < enemy.radius + building.radius // true als binnen building radius dus
    }) // op welke enemies kunnen we schieten? select enemies array, filter op enemies in radius
    building.target = validEnemies[0]

    for (let i = building.projectiles.length - 1; i >= 0; i--) {
      const projectile = building.projectiles[i]

      projectile.update ()

      const xDifference = projectile.enemy.center.x - projectile.position.x // elke projectile heeft een enemy geassocieerd in de projectile klasse
      const yDifference = projectile.enemy.center.y - projectile.position.y // elke projectile heeft een enemy geassocieerd in de projectile klasse
      const distance = Math.hypot (xDifference, yDifference) // check for collision between projectile and building, vind distance tussen centers
      
      // when an projectile hits an enemy
      if (distance < projectile.enemy.radius + projectile.radius) { // projectile is colliding met enemy
        // enemy health and enemy removal
        projectile.enemy.health -= 20
        if (projectile.enemy.health <= 0) { // enemy dood
          const enemyIndex = enemies.findIndex ((enemy) => { // vind de index van de dode enemy in de enemies array
            return projectile.enemy === enemy // return dode enemy is equal to 'enemy'  // return true /false
          })

          if (enemyIndex > -1) { // als enemyindex false is, is enemyIndex -1 en kan er bugs komen
            enemies.splice (enemyIndex, 1)
            coins += 25
            document.querySelector('#coins').innerHTML = coins
          }
        }
        
        explosions.push(new Sprite({position: {x: projectile.position.x, y: projectile.position.y}, imageSrc: './img/explosion.png', frames: {max: 4}}))
        building.projectiles.splice (i, 1) // at index i, remove 1 value from projectiles
      }
    }
  })
}

const mouse = {
  x: undefined,
  y: undefined
}

canvas.addEventListener ('click', (event) => { // luister naar clicks op het canvas alleen
  if (activeTile && ! activeTile.isOccupied && coins >= 50) { // dus if we are colliding with a tile
    coins -= 50
    document.querySelector('#coins').innerHTML = coins
    buildings.push (new Building ({
      position: {
        x: activeTile.position.x,
        y: activeTile.position.y
      }
    })
    )
    activeTile.isOccupied = true
    buildings.sort((a, b) => { // building a, building b in de array naast elkaar
      return a.position.y - b.position.y
    })
  }
}) 

window.addEventListener ('mousemove', (event) => { // hou bij in mouse.x en mouse.y
  mouse.x = event.clientX                          // waar de muis zich bevind (coord)
  mouse.y = event.clientY                          // elke keer dat de muis zich beweegt

  activeTile = null // zorgen dat als die niet op een tile is, het altijd null is
  for (let i = 0; i < placementTiles.length; i++) { // loop door de placementtiles
    const tile = placementTiles[i]

    if (mouse.x > tile.position.x && 
      mouse.x < tile.position.x + tile.size && 
      mouse.y > tile.position.y && 
      mouse.y < tile.position.y + tile.size) {
      activeTile = tile
      break // stop de for loop
    }
  }
})

animate() 

// bij splice () is het beter een traditionele for loop te gebruiken, en niet 'for each'