import React, { Component } from "react";
import { StyleSheet, View , Text } from "react-native";
import Files from "./Files";
import * as THREE from "three"; // 0.88.0
import Expo from "expo";
import { Group, Node, Sprite, SpriteView } from "./GameKit";

const SPEED = 3.0;
const GRAVITY = 1500;
const FLAP = 450;
const SPAWN_RATE = 900;
const OPENING = 120;
const GROUND_HEIGHT = 64;
const ENEMYSPEED = 5.0
const ENEMY_SPAWN_RATE = 1600


export default class Game extends Component {

  pipes = new Group();
  deadPipeTops = [];
  deadPipeBottoms = [];

  enemies = new Group();
  deadEnemies = [];


  onSetup = async ({ scene }) => {
    //Give us global reference to the scene
    this.scene = scene;
    this.scene.add(this.pipes);
    this.scene.add(this.enemies)
    await this.setupBackground();
    await this.setupPlayer();
    await this.setupGround();
  };


  setupEnemy = async ({y}) => {
    const size = {
      width: 35,
      height: 25
    }

    const enemy = await this.setupStaticNode({
      image: Files.sprites.bulletBill,
      size
    })
    enemy.size = size;
    enemy.y = y
    return enemy
  }

  spawnEnemy = async (openPos) => {

    let enemyY = Math.floor(openPos - OPENING / 2 - 100);
    //console.log(enemyY)

    let enemy;

    const end = this.scene.bounds.right + 26;

    if(this.deadEnemies.length > 0) {
      enemy = this.deadEnemies.pop().revive();
      enemy.reset(end, enemyY)
    } else {
      enemy = await this.setupEnemy({
        y: enemyY
      })
      enemy.x = end;
      this.enemies.add(enemy)
    }
    enemy.velocity = -ENEMYSPEED;
    return enemy
  }

  spawnEnemies = () => {
    this.enemies.forEachAlive(enemy => {
      if(enemy.size && enemy.x + enemy.size.width < this.scene.bounds.left) {
        this.deadEnemies.push(enemy.kill())
      }
    });

    const enemyY = (this.scene.size.height / 2 +
    (Math.random() - 0.5) * this.scene.size.height * 0.2) - 210;
    if(SPEED >= 7){
      this.spawnEnemy(enemyY)
    }
    //this.spawnEnemy(enemyY, true)

  }





  setupGround = async () => {
    const { scene } = this;
    const size = {
      width: scene.size.width,
      height: scene.size.width * 0.333333333
    };
    this.groundNode = new Group();

    // 2
    const node = await this.setupStaticNode({
      image: Files.sprites.ground,
      size,
      name: "ground"
    });

    const nodeB = await this.setupStaticNode({
      image: Files.sprites.ground,
      size,
      name: "ground"
    });
    nodeB.x = size.width;

    this.groundNode.add(node);
    this.groundNode.add(nodeB);

    // 3
    this.groundNode.position.y =
      (scene.size.height + (size.height - GROUND_HEIGHT)) * -0.5;

    // 4
    this.groundNode.top = this.groundNode.position.y + size.height / 2;

    this.groundNode.position.z = 0.01;
    scene.add(this.groundNode);
  };


  setupPipe = async ({ y }) => {
    const size = {
      width: 15,
      height: 137,
    };

    // 1
    //define a dictionary for our images

    const pipe = await this.setupStaticNode({
      image: Files.sprites.pipe_bottom,
      size
    });
    // 2
    //give the pipe a reference to its size
    pipe.size = size;
    pipe.y = y;

    return pipe;
  };

  spawnPipe = async (openPos) => {
    // 1
    //first we want to get a random position for our pipes
    let pipeY;

    pipeY = Math.floor(openPos - OPENING / 2 - 330);

    let pipe;

    // 3
    //here we set the initial X position for the pipe - this is just off screen to the right
    const end = this.scene.bounds.right + 26;
    // 4
    //now we check if there are any offscreen pipes that we can just reposition
     if (this.deadPipeBottoms.length > 0) {
      pipe = this.deadPipeBottoms.pop().revive();
      pipe.reset(end, pipeY);
    } else {
      // 5
      //if there aren't any pipes to recycle then we will create some and add them to the pipes group
      pipe = await this.setupPipe({
        y: pipeY,
        // key: pipeKey,
      });
      pipe.x = end;
      this.pipes.add(pipe);
    }
    // Set the pipes velocity so it knows how fast to go
    pipe.velocity = -SPEED;
    return pipe;
  }

  spawnPipes = () => {
    this.pipes.forEachAlive(pipe => {
      // 1
      //if any pipes are off screen then we want to flag them as "dead" so we can recycle them
      if (pipe.size && pipe.x + pipe.size.width < this.scene.bounds.left) {
        if (pipe.name === 'bottom') {
          this.deadPipeBottoms.push(pipe.kill());
        }
      }
    });

    // 2
    //get a random spot for the center of the two pipes
    const pipeY =
      (this.scene.size.height / 2) +
      (Math.random() - 0.5) * (this.scene.size.height * .1) - 60;
    // 3
    //spawn both pipes around this point
      this.spawnPipe(pipeY);
      this.spawnPipe(pipeY, true);
  };

  setupPlayer = async () => {
    // 1
    //create the players display size, image size divided by number os sprites
    const size = {
      width: 26,
      height: 36
    };

    // 2
    //Make a sprite just like before, but add properties for animation
    const sprite = new Sprite();
    await sprite.setup({
      image: Files.sprites.wolf,
      tilesHoriz: 5,  //how many tiles we have crossed, in this case 3
      tilesVert: 1,  //how many tiles we have vertically, in this case 1
      numTiles: 5,  //the number of tiles in total
      tileDispDuration: 100, //how long each tiles is on screen before it goes to the next one, measured n milliseconds
      size  //the size we defined earlier
    });

    // 3
    //make a new node and give it our animated sprite, and then add it to the scene
    this.player = new Node({
      sprite
    });
    this.scene.add(this.player);
  };

  setupBackground = async () => {
    // 1
    const { scene } = this;
    const { size } = scene;
    // 2
    const bg = await this.setupStaticNode({
      image: Files.sprites.newBackground,
      size: { "height": 500, "width": 400 },
      name: 'bg',
    });
    // 3
    scene.add(bg);
  };

  setupStaticNode = async ({ image, size, name }) => {
    // 1
    //Create a new sprite from our GameKit and give it a image, and a size
    const sprite = new Sprite();

    await sprite.setup({
      image,
      size,
    });
    // 2
    //now we create a Node with our Sprite and we give it a name for reference
    const node = new Node({
      sprite,
    });
    node.name = name;
    return node;
  };

  gameOver = false;

updateGame = delta => {
  if (this.gameStarted) {
    // 1

    //the game started and we want to add gravity * delta to our velocity
    this.velocity -= GRAVITY * delta;
    //2

    //here we set the wolfs rotation. we clamp it with min/max so when the wolf has upwards velocity it spins to point up and the opposite happens when its falling down
    const target = this.groundNode.top;
    if (!this.gameOver) {
      const playerBox = new THREE.Box3().setFromObject(this.player);

      this.player.y += this.velocity * delta;
      this.enemies.forEachAlive(enemy => {
        enemy.x += enemy.velocity
        const enemyBox = new THREE.Box3().setFromObject(enemy);
        if(enemyBox.intersectsBox(playerBox)) {
          this.setGameOver();
        }
      })
      this.pipes.forEachAlive(pipe => {
        pipe.x += pipe.velocity;
        const pipeBox = new THREE.Box3().setFromObject(pipe);

        // 2
        if (!pipe.passed && pipe.x < this.player.x){
          pipe.passed = true;
          this.addToScore();
          if(SPEED <= 8) SPEED += .2
        }


        if (playerBox.intersectsBox(pipeBox)) {
          this.setGameOver();
        }


      });

      this.groundNode.children.map((node, index) => {
        // 2
        node.x -= SPEED;
        // 3

        if (node.x < this.scene.size.width * -1) {
          let nextIndex = index + 1;
          if (nextIndex === this.groundNode.children.length) {
            nextIndex = 0;
          }
          const nextNode = this.groundNode.children[nextIndex];
          node.x = nextNode.x + this.scene.size.width - 1.55;
        }
      });
    }
    // this.player.angle = Math.min(
    //   Math.PI / 3,
    //   Math.max(-Math.PI / 3, (FLAP + this.velocity) / FLAP)
    // );
    this.player.update(delta);
    this.player.y += this.velocity * delta;

    if (this.player.y <= target) {
      //this.player.angle = -Math.PI / 2;
      this.player.y = target;
      this.velocity = 0;
    }
  } else {
    this.player.y = 8 * Math.cos(Date.now() / 200);
    this.player.angle = 0;
    this.player.update(delta);
  }
};

  state = {
    score: 0,
    highScore: 0
  };

  addToScore = () => {
    this.setState({ score: (this.state.score + 1)});
  }

  setHighScore = () => {
    this.setState({highScore: (this.state.score)})
  }

  renderScore = () => (
    <Text
        style={{
            textAlign: "right",
            fontSize: 40,
            position: "absolute",
            left: 0,
            right: 0,
            color: "white",
            top: 64,
            backgroundColor: "transparent"
        }}>
    {this.state.score}
    </Text>
  );

  renderHighScore = () => (
    <View>
      <Text
        style={{
          textAlign: "left",
          fontSize: 40,
          position: "absolute",
          left: 0,
          right: 0,
          color: "white",
          top: 64,
          backgroundColor: "transparent"
        }}>
        High{"\n"}
        {this.state.highScore}
      </Text>

    </View>
  )

  setGameOver = () => {
    // 1
    this.gameOver = true;
    //console.log(this.enemyInterval)
    if(this.state.score > this.state.highScore){
      this.setHighScore();
    }
    clearInterval(this.pillarInterval);
    clearInterval(this.enemyInterval);
    // this.reset();

    SPEED = 3.0
  };

  // 2
  reset = () => {
    this.gameStarted = false;
    this.gameOver = false;
    this.setState({ score: 0 });

    this.player.reset(this.scene.size.width * -0.3, 0);
    this.player.angle = 0;
    //this.pillarInterval = setInterval(this.spawnPipes, SPAWN_RATE);
    this.pipes.removeAll();
    this.enemies.removeAll();
  };
  velocity = 0;



  tap = () => {
    const target = this.groundNode.top;
    // 1
    //on the first tap we start the game
    if (!this.gameStarted) {
      this.gameStarted = true;
      // 2
      //here we build a timer to spawn the pipes
      this.pillarInterval = setInterval(this.spawnPipes, SPAWN_RATE);
      this.enemyInterval = setInterval(this.spawnEnemies, ENEMY_SPAWN_RATE)

    }
    if (!this.gameOver) {
      // 1
      //if the game hasn't ended yet, then we should set our players velocity to a constant velocity we defined earlier
      if(this.player.y === target) this.velocity = FLAP;
    } else {
      // 2
      //if the game has ended then we should reset it
      this.reset();
    }
  }

  render() {
    // 3
    //call you tap function from the sprite view
    return (
      <View style={StyleSheet.absoluteFill}>
        <SpriteView
          touchDown={({ x, y }) => this.tap()}
          update={this.updateGame}
          onSetup={this.onSetup}
        />
          {this.renderScore()}
          {this.renderHighScore()}
      </View>
    );
  }
}
