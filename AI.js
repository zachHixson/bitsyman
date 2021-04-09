let world;

class Pacman{
    constructor(){
        this.x = player().x;
        this.y = player().y;
        this.direction = [1, 0];
        this.isEnergized = false;
    }

    update(){
        var prevX = this.x;
        var prevY = this.y;
        this.x = player().x;
        this.y = player().y;

        let newDirection = [
            this.x - prevX,
            this.y - prevY
        ];

        if (newDirection[0] != 0 || newDirection[1] != 0){
            this.direction = newDirection;
        }

        //check if you won
        if (getRoom().items.length <= 4){
            world.win();
        }
        
        this.checkTeleporter();
        this.checkGhostCollision();
    }

    checkTeleporter(){
        //use teleporter
        if (this.y == world.teleporterY){
            if (this.x >= 15){
                this.x = 1;
            }
            else if (this.x <= 0){
                this.x = 14;
            }

            player().x = this.x;
        }
    }

    checkGhostCollision(){
        for (let ghost in world.ghosts){
            let curGhost = world.ghosts[ghost];

            if (this.x == curGhost.x && this.y == curGhost.y && !this.gamePause){
                if (this.isEnergized && curGhost.isFrightened){
                    curGhost.kill();
                }
                else if (curGhost.subroutine != curGhost.killed){
                    world.gameOver();
                }
            }
        }
    }
}

class Ghost{
    constructor(xIn, yIn, idIn, palIn){
        this.x = xIn;
        this.y = yIn;
        this.id = idIn;
        this.pal = palIn;
        this.isFrightened = false;
        this.cagedTimer = 10;
        this.scatterTimer = 0;
        this.direction = [0, 0];
        this.target = [0, 0];
        this.scatterTarget = this.getScatterCorner();
        this.subroutine = this.pace;

        this.direction[0] = (Math.round(Math.random()) == 0) ? -1 : 1;
    }

    update(){
        this.scatterTimer++;
        this.subroutine();
        this.sync();
    }

    getScatterCorner(){return [0,0]};

    moveDirection(){
        this.x = clamp(this.x + this.direction[0], 0, 15);
        this.y = clamp(this.y + this.direction[1], 0, 15);

        //use teleporter
        if (this.y == world.teleporterY){
            if (this.x >= 15){
                this.x = 1;
            }
            else if (this.x <= 0){
                this.x = 14;
            }
        }
    }

    moveToTarget(){
        let cardDir = [
            [0, -1],
            [-1, 0],
            [0, 1],
            [1, 0]
        ]
        let nextDir = cardDir[0];
        let nextDistance = this.getDistanceToTarget(this.x + nextDir[0], this.y + nextDir[1]);

        //3 spaces around ghost and their distance to destination
        for (let i = 1; i < cardDir.length; i++){
            let checkSpace = [
                this.x + cardDir[i][0],
                this.y + cardDir[i][1]
            ];

            if (
                !this.checkCollision(checkSpace[0], checkSpace[1]) &&
                (cardDir[i][0] != this.direction[0] * -1 || cardDir[i][1] != this.direction[1] * -1)
            ){
                let checkDist = this.getDistanceToTarget(checkSpace[0], checkSpace[1]);

                if (
                    checkDist < nextDistance ||
                    this.checkCollision(this.x + nextDir[0], this.y + nextDir[1])
                ){
                    nextDistance = checkDist;
                    nextDir = cardDir[i];
                }
            }
        }

        //lowest distance space that is not collision gets direction set
        this.direction = nextDir;
        this.moveDirection();
    }

    cage(){
        this.setColor(this.pal);
        this.subroutine = this.pace;
        this.cagedTimer = 8;
        this.isFrightened = false;
    }

    free(){
        this.y = 5;

        if (this.isFrightened){
            this.subroutine = this.frightened;
        }
        else{
            this.subroutine = this.chase;
        }
    }

    scare(){
        this.setColor(7);
        this.isFrightened = true;

        if (this.subroutine != this.pace){
            this.subroutine = this.frightened;
        }
    }

    pacify(){
        this.isFrightened = false;

        if (this.subroutine != this.killed){
            this.setColor(this.pal);

            if (this.subroutine != this.pace){
                this.subroutine = this.chase;
            }
        }
    }

    kill(){
        let ghostHouseTiles = [
            [7,7],
            [8, 7],
            [7, 8],
            [8, 8]
        ];
        let closestDist = this.getDistanceToPoint(ghostHouseTiles[0][0], ghostHouseTiles[0][1]);

        //find nearest ghostHouse tile
        for (let i = 1; i < ghostHouseTiles.length; i++){
            let checkDist = this.getDistanceToPoint(ghostHouseTiles[i][0], ghostHouseTiles[i][1]);
            if (checkDist < closestDist){
                closestDist = checkDist;
                this.target = ghostHouseTiles[i];
            }
        }

        getItemFromList(this.id, item).col = 8;
        this.subroutine = this.killed;
    }

    pace(){
        let idx = getItemRoomIdx(this.id, world.room.items);
        let curPosition = [world.room.items[idx].x, world.room.items[idx].y];

        if (this.checkCollision(this.x + this.direction[0], this.y + this.direction[1])){
            this.direction[0] *= -1;
            this.direction[1] *= -1;
        }

        this.moveDirection();
        if (this.cagedTimer > 0){
            this.cagedTimer--;
        }
        else{
            world.freeGhost();
        }
    }

    chase(){
        this.getTarget();

        if (this.scatterTimer > 100){
            this.target = this.getScatterCorner();
            this.direction[0] *= -1;
            this.direction[1] *= -1;
            this.subroutine = this.scatter;
            this.scatterTimer = 0;
        }

        this.moveToTarget();
    }

    scatter(){
        if (this.scatterTimer > 20){
            this.direction[0] *= -1;
            this.direction[1] *= -1;
            this.subroutine = this.chase;
            this.scatterTimer = 0;
        }

        this.moveToTarget();
    }

    frightened(){
        let cardDir = [
            [0, -1],
            [-1, 0],
            [0, 1],
            [1, 0]
        ]
        let validDirs = [];

        for (let i = 0; i < cardDir.length; i++){
            let checkSpace = [this.x + cardDir[i][0], this.y + cardDir[i][1]];

            if (
                !this.checkCollision(checkSpace[0], checkSpace[1]) &&
                (cardDir[i][0] != this.direction[0] * -1 || cardDir[i][1] != this.direction[1] * -1)
            ){
                validDirs.push(cardDir[i]);
            }
        }

        this.direction = validDirs[Math.floor(Math.random() * validDirs.length)];
        this.moveDirection();
    }

    killed(){
        if (this.getDistanceToTarget(this.x, this.y) > 2){
            this.moveToTarget();
        }
        else{
            this.x = this.target[0];
            this.y = this.target[1];
            this.cage();
        }
    }

    getTarget(){/*overridden to provide ghost specific targeting*/}

    checkCollision(x, y){
        return (
            x >= 16 || y >=16 ||
            x < 0 || y < 0 ||
            getTile(x, y) != "0"
        )
    }

    getDistanceToTarget(x, y){
        return this.getDistance(x, y, this.target[0], this.target[1]);
    }

    getDistanceToPoint(x, y){
        return this.getDistance(this.x, this.y, x, y);
    }

    getDistance(x1, y1, x2, y2){
        return Math.sqrt(
            Math.pow(x1 - x2,2) + 
            Math.pow(y1 - y2,2)
        );
    }

    setColor(colIn){
        getItemFromList(this.id, item).col = colIn;
    }

    sync(){
        let idx = getItemRoomIdx(this.id, world.room.items);
        world.room.items[idx].x = this.x;
        world.room.items[idx].y = this.y;
    }
}

class Blinky extends Ghost{
    getScatterCorner(){return [0,0]}

    getTarget(){
        this.target[0] = world.player.x;
        this.target[1] = world.player.y;
    }
}

class Pinky extends Ghost{
    getScatterCorner(){return [0,15]}
    
    getTarget(){
        this.target[0] = (world.player.direction[0] * 4) + world.player.x;
        this.target[1] = (world.player.direction[1] * 4) + world.player.y;
    }
}

class Inky extends Ghost{
    getScatterCorner(){return [15,0]}

    getTarget(){
        let frontTile = [
            (world.player.direction[0] * 2) + world.player.x,
            (world.player.direction[1] * 2) + world.player.y
        ]

        this.target = [
            ((world.ghosts.blinky.x - frontTile[0]) * -1) + frontTile[0],
            ((world.ghosts.blinky.y - frontTile[1]) * -1) + frontTile[1]
        ];
    }
}

class Clyde extends Ghost{
    getScatterCorner(){return [15,15]}

    getTarget(){
        if (this.getDistanceToPoint(world.player.x, world.player.y) > 8){
            this.target = [
                world.player.x,
                world.player.y
            ]
        }
        else{
            this.target = this.scatterTarget;
        }
    }
}

class World{
    constructor(playerIn, blinkyIn, pinkyIn, inkyIn, clydeIn, roomIn){
        this.player = playerIn;
        this.ghosts = {
            blinky : blinkyIn,
            pinky : pinkyIn,
            inky : inkyIn,
            clyde : clydeIn
        }
        this.room = roomIn;
        this.teleporterY = 8;
        this.gamePause = false;
        this.energizedTimer = -1;
    }

    update(){
        if (this.energizedTimer > 0){
            this.energizedTimer--;
        }
        else if (this.energizedTimer == 0){
            this.deEnergize();
            this.energizedTimer = -1;
        }

        this.player.update();

        for (let ghost in this.ghosts){
            let curGhost = this.ghosts[ghost];
            curGhost.update();
        }
    }

    freeGhost(){
        let ghostChoice = Math.floor(Math.random() * 4);
        let ghostIdx = 0;
        //go through all ghosts who are caged and select one at random. Reset all other ghosts to 10.
        for (let ghost in this.ghosts){
            if (this.ghosts[ghost].subroutine == this.ghosts[ghost].pace && ghostIdx == ghostChoice){
                this.ghosts[ghost].free();

                for (ghost in this.ghosts){
                    if (this.ghosts[ghost].subroutine == this.ghosts[ghost].pace){
                        this.ghosts[ghost].cagedTimer = Math.floor(Math.random() * 5) + 10;
                    }
                }

                return true;
            }
            ghostIdx++;
        }

        return false;
    }

    energize(){
        this.player.isEnergized = true;
        this.energizedTimer = 20;

        for (let ghost in this.ghosts){
            this.ghosts[ghost].scare();
        }
    }

    deEnergize(){
        this.player.isEnergized = false;

        for (let ghost in this.ghosts){
            this.ghosts[ghost].pacify();
        }
    }

    gameOver(){
        if (!this.gamePause){
            this.gamePause = true;
            let youDiedId = getItemId("you_died", sprite);
            startSpriteDialog(youDiedId);
        }
    }

    win(){
        if (!this.gamePause){
            this.gamePause = true;
            let youWonId = getItemId("you_win", sprite);
            startSpriteDialog(youWonId);
        }
    }
}

function pStart(){
    let roomItems = getRoom().items;
    let player = new Pacman(sprite['A'].x, sprite['A'].y);
    let blinky = new Blinky(
        roomItems[getItemRoomIdx(getItemId("ghost_red_PERM", item), roomItems)].x,
        roomItems[getItemRoomIdx(getItemId("ghost_red_PERM", item), roomItems)].y,
        getItemId("ghost_red_PERM", item),
        3
    );
    let pinky = new Pinky(
        roomItems[getItemRoomIdx(getItemId("ghost_pink_PERM", item), roomItems)].x,
        roomItems[getItemRoomIdx(getItemId("ghost_pink_PERM", item), roomItems)].y,
        getItemId("ghost_pink_PERM", item),
        6
    );
    let inky = new Inky(
        roomItems[getItemRoomIdx(getItemId("ghost_blue_PERM", item), roomItems)].x,
        roomItems[getItemRoomIdx(getItemId("ghost_blue_PERM", item), roomItems)].y,
        getItemId("ghost_blue_PERM", item),
        4
    );
    let clyde = new Clyde(
        roomItems[getItemRoomIdx(getItemId("ghost_orange_PERM", item), roomItems)].x,
        roomItems[getItemRoomIdx(getItemId("ghost_orange_PERM", item), roomItems)].y,
        getItemId("ghost_orange_PERM", item),
        5
    );

    //push white to pallete
    palette[0].colors.push([255, 255, 255]);
    
    world = new World(player, blinky, pinky, inky, clyde, getRoom());

    setInterval(function(){pUpdate()}, 300);
}

function pUpdate(){
    world.update();
}

function getItemId(itemName, itemList){
    for (idx in itemList){
        if (itemList[idx].name == itemName){
            return itemList[idx].id;
        }
    }
}

function getItemFromList(itemId, itemList){
    for (idx in itemList){
        if (itemList[idx].id == itemId){
            return itemList[idx];
        }
    }
}

function getItemRoomIdx(itemId, roomList){
    for (idx in roomList){
        if (roomList[idx].id == itemId){
            return idx;
        }
    }
}

function getItemInRoom(itemId){
    for (let i = 0; i < getRoom().items.length; i++){
        if (item[i].id == itemid){
            return item[i];
        }
    }
}

function getRoomIdx(roomName, rooms){
    for (let room in rooms){
        if (rooms[room].name == roomName){
            return room.id;
        }
    }
}

function spawnItem(itemId, xIn, yIn){
    getRoom().items.push({
        id:itemId,
        x: xIn,
        y: yIn
    });
}

function removeItem(itemName, itemList){
    let found = itemList[getItemId(itemName, itemList)];

    for (let i = 0; i < getRoom().items.length; i++){
        if (getRoom().items[i].id == found.id){
            getRoom().items.splice(i, 1);
        }
    }
}

function clamp(num, min, max){
    return Math.min(Math.max(num, min), max);
}

function ppCollected(){
    world.energize();
}