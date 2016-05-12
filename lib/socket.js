/**
 * Module dependencies.
 */
var io = require('socket.io')();

/**
 * Socket prototype.
 */
exports = module.exports = io;

var rooms = {};

io.sockets.on('connection', function (client) {
    /**
     * Returns or creates room descriptor
     * @param {String} channel channel/room name
     */
    function getRoom(channel) {
        return rooms[channel] = rooms[channel] || { clients: {} };
    }

    /**
     * Joins room
     * @param {String} channel channel/room name
     */
    function joinTo(channel) {
        if (client.channel === channel) {
            return;
        }
        var room = getRoom(channel);

        // add self
        room.clients[client.id] = {
            audio: false,
            screen: false,
            video: true
        };

        client.channel = channel;
    }

    /**
     * Leaves room
     * @param {String} [channel] channel/room name
     */
    function leave(channel) {
        channel = channel || client.channel;
        var room = getRoom(channel);

        // remove current client from room
        delete room.clients[client.id];

        // notify other peers but not self in current channel
        Object.keys(room.clients).forEach(function (client_id) {
            io.sockets.connected[client_id].emit('remove', {
                id: client.id
            });
        });

        // remove room if no clients
        if (!Object.keys(room).length) {
            delete rooms[channel];
        }
    }

    client.on('join', function (channel, fn) {
        // send list of other clients in that room
        fn(null, getRoom(channel));

        // then add self to that room
        joinTo(channel);
    });

    client.on('leave', leave);
    client.on('disconnect', leave);

    client.on('create', function (channel, fn) {
        // send channel name back
        fn(null, channel);

        // then add self to that room
        joinTo(channel);
    });

    // forward messages
    client.on('message', function (message) {
        message.from = client.id;
        io.sockets.connected[message.to].emit('message', message);
    });
});