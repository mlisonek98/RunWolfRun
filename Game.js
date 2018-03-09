import React from "react";
import { StyleSheet, View } from "react-native";
import Files from "./Files";
import * as THREE from "three"; // 0.88.0
import Expo from "expo";
import { Group, Node, Sprite, SpriteView } from "./GameKit";

const SPEED = 1.6;
const GRAVITY = 1700;
const FLAP = 320;
const SPAWN_RATE = 2600;
const OPENING = 120;
const GROUND_HEIGHT = 64;


export default class Game extends React.Component {
  componentWillMount() {
  }

  pipes = new Group();
  deadPipeTops = [];
  deadPipeBottoms = [];



  onSetup = async ({ scene }) => {
    //Give us global reference to the scene
    this.scene = scene;
    this.scene.add(this.pipes);
    await this.setupBackground();
    await this.setupPlayer();
    await this.setupGround();
  };


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


  setupPipe = async ({ key, y }) => {
    const size = {
      width: 52,
      height: 320,
    };

    // 1
    //define a dictionary for our images
    const tbs = {
      top: Files.sprites.pipe_top,
      bottom: Files.sprites.pipe_bottom,
    };
    const pipe = await this.setupStaticNode({
      image: tbs[key],
      size,
      name: key,
    });
    // 2
    //give the pipe a reference to its size
    pipe.size = size;
    pipe.y = y;

    return pipe;
  };

  spawnPipe = async (openPos, flipped) => {
    // 1
    //first we want to get a random position for our pipes
    let pipeY;
    if (flipped) {
      pipeY = Math.floor(openPos - OPENING / 2 - 320);
    } else {
      pipeY = Math.floor(openPos + OPENING / 2);
    }
    // 2
    //next we define if it's a top or bottom pipe
    let pipeKey = flipped ? 'bottom' : 'top';
    let pipe;

    // 3
    //here we set the initial X position for the pipe - this is just off screen to the right
    const end = this.scene.bounds.right + 26;
    // 4
    //now we check if there are any offscreen pipes that we can just reposition
    if (this.deadPipeTops.length > 0 && pipeKey === 'top') {
      pipe = this.deadPipeTops.pop().revive();
      pipe.reset(end, pipeY);
    } else if (this.deadPipeBottoms.length > 0 && pipeKey === 'bottom') {
      pipe = this.deadPipeBottoms.pop().revive();
      pipe.reset(end, pipeY);
    } else {
      // 5
      //if there aren't any pipes to recycle then we will create some and add them to the pipes group
      pipe = await this.setupPipe({
        y: pipeY,
        key: pipeKey,
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
        if (pipe.name === 'top') {
          this.deadPipeTops.push(pipe.kill());
        }
        if (pipe.name === 'bottom') {
          this.deadPipeBottoms.push(pipe.kill());
        }
      }
    });

    // 2
    //get a random spot for the center of the two pipes
    const pipeY =
      this.scene.size.height / 2 +
      (Math.random() - 0.5) * this.scene.size.height * 0.2;
    // 3
    //spawn both pipes around this point
    this.spawnPipe(pipeY);
    this.spawnPipe(pipeY, true);
  };

  setupPlayer = async () => {
    // 1
    //create the players display size, image size divided by number os sprites
    const size = {
      width: 36,
      height: 26
    };

    // 2
    //Make a sprite just like before, but add properties for animation
    const sprite = new Sprite();
    await sprite.setup({
      image: Files.sprites.bird,
      tilesHoriz: 3,  //how many tiles we have crossed, in this case 3
      tilesVert: 1,  //how many tiles we have vertically, in this case 1
      numTiles: 3,  //the number of tiles in total
      tileDispDuration: 50, //how long each tiles is on screen before it goes to the next one, measured n milliseconds
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

  addScore = () => {

  }

  gameOver = false;

updateGame = delta => {
  if (this.gameStarted) {
    // 1
    //the game started and we want to add gravity * delta to our velocity
    this.velocity -= GRAVITY * delta;
    //2

    //here we set the birds rotation. we clamp it with min/max so when the bird has upwards velocity it spins to point up and the opposite happens when its falling down
    const target = this.groundNode.top;
    if (!this.gameOver) {
      const playerBox = new THREE.Box3().setFromObject(this.player);
      this.player.y += this.velocity * delta;
      this.player.angle = Math.min(
        Math.PI / 6,
        Math.max(-Math.PI / 2, (FLAP + this.velocity) / FLAP)
      );
      this.pipes.forEachAlive(pipe => {
        pipe.x += pipe.velocity;
        const pipeBox = new THREE.Box3().setFromObject(pipe);

        // 2
        if (
          pipe.name === "bottom" &&
          !pipe.passed &&
          pipe.x < this.player.x
        ) {
          pipe.passed = true;
          this.addScore();
        }


        if (pipeBox.intersectsBox(playerBox)) {
          this.setGameOver();
        }



        // 4
        // 2
      });

      if (this.player.y <= target) {
        this.setGameOver();
      }

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
          // 4
          node.x = nextNode.x + this.scene.size.width - 1.55;
        }
      });
    }
    this.player.angle = Math.min(
      Math.PI / 3,
      Math.max(-Math.PI / 3, (FLAP + this.velocity) / FLAP)
    );
    this.player.update(delta);
    this.player.y += this.velocity * delta;

    if (this.player.y <= target) {
      this.player.angle = -Math.PI / 2;
      this.player.y = target;
      this.velocity = 0;
    }
  } else {
    this.player.y = 8 * Math.cos(Date.now() / 200);
    this.player.angle = 0;
    this.player.update(delta);
  }
};

  setGameOver = () => {
    // 1
    this.gameOver = true;
    clearInterval(this.pillarInterval);
  };

  // 2
  reset = () => {
    this.gameStarted = false;
    this.gameOver = false;
    this.setState({ score: 0 });

    this.player.reset(this.scene.size.width * -0.3, 0);
    this.player.angle = 0;
    this.pipes.removeAll();
  };
  velocity = 0;



  tap = () => {
    // 1
    //on the first tap we start the game
    if (!this.gameStarted) {
      this.gameStarted = true;
      // 2
      //here we build a timer to spawn the pipes
      this.pillarInterval = setInterval(this.spawnPipes, SPAWN_RATE);
    }
    if (!this.gameOver) {
      // 1
      //if the game hasn't ended yet, then we should set our players velocity to a constant velocity we defined earlier
      this.velocity = FLAP;
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
      </View>
    );
  }
}
