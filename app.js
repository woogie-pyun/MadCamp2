const express = require('express');
const app = express();
const http = require('http');
const socket = require("socket.io");

const mongoClient = require('mongodb').MongoClient;

const url = 'mongodb://localhost:27017';

app.use(express.json());

const server = app.listen(3000, () => {
    console.log("Listening on port 3000....");
});

const io = socket(server);

function getRandomIntInclusive(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min; //�ִ񰪵� ����, �ּڰ��� ����
  }

function randCard(deck){
    var fruit = getRandomIntInclusive(0, 3);
    var rawNum = getRandomIntInclusive(0,13);
    var num;
    if(rawNum>=0 && rawNum<=4){
        num = 0;
    } else if(rawNum>=5 && rawNum<=7){
        num = 1;
    } else if(rawNum>=8 && rawNum<=10){
        num = 2;
    } else if(rawNum>=11 && rawNum<=12){
        num = 3;
    } else{
        num = 4;
    };
    if(deck[fruit][num] != 0){
        deck[fruit][num]--;
        return {'fruit': fruit, 'num': num};
    } else{
        return randCard(deck);
    };
};

function addToOpen(list, size, item){
    if(list.length === size){
        list.shift();
        list.push(item);
    }else{
        list.push(item);
    };
};

function isFive(opencards){
    var fruit0 = 0;
    var fruit1 = 0;
    var fruit2 = 0;
    var fruit3 = 0;
    var size = opencards.length;
    for(var i = 0; i<size; i++){
        var fruit = opencards[i].fruit;
        var num = opencards[i].num+1;
        switch(fruit) {
            case 0:
                fruit0 += num;
                break;
            case 1:
                fruit1 += num;
                break;
            case 2:
                fruit2 += num;
                break;
            case 3:
                fruit3 += num;
                break;
            default:
                console.log("Non-Existent Fruit!");
                break;
        };
    }
    if(fruit0==5 || fruit1==5 || fruit2==5 || fruit3==5){
        return true;
    } else {
        return false;
    };
};

const timer = ms => new Promise(res => setTimeout(res, ms));
var count = 0;
var whoRang = [];


mongoClient.connect(url, (err, db) => {
    if(err){
        console.log("Error while connecting mongo client");
    } else{
        console.log("Connected to mongo client");
        
        const myDb = db.db('HalliGalliDB');
        const collection = myDb.collection('Users');
        const collection2 = myDb.collection('Rooms');

        io.on('connection', (socket) => {
            console.log('User connected '+socket.id);   
            
            socket.on("join room", async (arg1, arg2) => {
                socket.nickname = arg2;
                socket.join(arg1);
                await io.to(arg1).emit('player join');
            });
            socket.once('ready', (arg1,arg2)=>{
                const roomName = arg1;
                const num_player = arg2;
                console.log(arg2)
                count++;
                console.log("Socket: "+socket.nickname+" Count: ",count);
                if(count == num_player){
                    var player_list;
                    collection2.findOne({name: roomName}, (err, result)=>{
                        player_list = result.player_list;
                    });
                    console.log("emitting test");
                    count = 0;
                    setTimeout(async function(){
                        console.log(player_list);
                        var cards = [
                            [5,3,3,2,1],
                            [5,3,3,2,1],
                            [5,3,3,2,1],
                            [5,3,3,2,1]
                        ];
                        io.to(roomName).emit('initial turn', player_list);
                        var opencards = [];
                        var turn = 0;
                        var test = 0;
                        while(test < 56){
                            var flipCard = randCard(cards);
                            addToOpen(opencards, num_player, flipCard);
                            console.log("Player: "+player_list[turn]);
                            console.log(opencards);
                            if(isFive(opencards)){
                                io.to(roomName).emit('turn', flipCard.fruit, flipCard.num, player_list[turn], 1);
                                console.log("Waiting for bell");
                                socket.once('bell',(arg1)=>{
                                   var winner = arg1; 
                                   console.log("Bell Rang", arg1);
                                });
                            } else{
                                io.to(roomName).emit('turn', flipCard.fruit, flipCard.num, player_list[turn], 0);
                            };
                            turn = (turn+1)%num_player;
                            test++;//
                            await timer(2000);
                        };
                    }, 3000);
                };
            });
            socket.on('exit room', (arg1,arg2)=>{
                count--;
                console.log("Socket: "+socket.nickname+" Count: ",count);
                io.to(arg1).emit('player exit');
                socket.leave(arg1);
                
            });
        });
        app.post('/signup', (req, res)=>{
            console.log("Signing up");
            const newUser = {
                name: req.body.name,
                game_id: req.body.game_id,
                password: req.body.password,
                logged_in: 0
            };

            const query = {game_id: newUser.game_id};

            collection.findOne(query, (err, result)=>{
                if(result == null){
                    collection.insertOne(newUser, (err, result)=>{
                        res.status(200).send();
                        console.log("send 200");
                    })
                } else{
                    res.status(400).send();
                    console.log("send 400");
                };
            })
        });

        app.post('/login', (req, res)=>{
            console.log("Logging in");
            const query = {
                game_id: req.body.game_id,
                password: req.body.password
            };
            collection.findOne(query, (err, result)=>{
                if(result != null && result.logged_in == 0){
                    const objToSend = {
                        name: result.name,
                        game_id: result.game_id
                    };
                    console.log("send200")
                    const newValue = {
                        $set: {logged_in: 1}
                    };
                    collection.updateOne(query, newValue);
                    res.status(200).send(JSON.stringify(objToSend));
                } else{
                    console.log("400")
                    res.status(404).send();
                };
            });
        });

        app.post('/logout', (req,res)=>{
            console.log("Logging out...");
            const query = {
                game_id: req.body.game_id
            };
            const newValue = {
                $set: {logged_in: 0}
            };
            collection.updateOne(query, newValue);
            res.status(200).send();
        })

        app.get('/rooms', (req, res)=>{
            console.log("Finding rooms...");
            const query = {
                $where : "this.cur_player != this.num_player"
            };
            collection2.find(query).toArray(function(err, docs)  {
                res.status(200).send(JSON.stringify(docs))
            });
        });

        app.post('/rooms', (req, res)=>{
            console.log("Creating rooms...");
            const query = {
                name: req.body.name
            };
            collection2.findOne(query, (err, result)=>{
                if(result == null){
                    const newRoom = {
                        name: req.body.name,
                        num_player: req.body.num_player,
                        cur_player: 0,
                        player_list: []
                    };
                    collection2.insertOne(newRoom, (err, result)=>{
                        res.status(200).send();
                        console.log('room added to db');
                    });
                } else {
                    console.log("Room Exists");
                    res.status(400).send();
                };
            });
            
        });

        app.post('/enter', (req, res)=>{
            console.log("Entering room...");
            const roomName = req.body.roomName;
            const game_id = req.body.game_id;
            const query = {
                name: roomName
            };
            const newValues = {
                $inc: {cur_player: 1},
                $push: {player_list: game_id}
            };
            collection2.updateOne(query, newValues);
            console.log("Incrementing");
            res.status(200).send();
        })

        app.post('/exit', (req, res)=>{
            console.log("Exiting room...");
            const roomName = req.body.roomName;
            const game_id = req.body.game_id;
            const query = {
                name: roomName
            };
            const newValues = {
                $inc: {cur_player: -1},
                $pull: {player_list: game_id}
            };
            collection2.updateOne(query, newValues);
            console.log("Decrementing");
            res.status(200).send();
        })

        app.post('/update', (req,res)=>{
            console.log("Updating room...");
            const roomName = req.body.roomName;
            const query = {
                name: roomName
            };
            collection2.findOne(query, (err, result)=>{
                const objToSend = {
                    numPlayer: result.num_player,
                    curPlayer: result.cur_player
                };
                res.send(JSON.stringify(objToSend));
            })
        })
    };
});