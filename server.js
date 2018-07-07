const express = require('express')
const app = express()
const bodyParser = require('body-parser')
const MongoClient = require('mongodb').MongoClient
const _ = require('lodash')

var db

MongoClient.connect(process.env.MONGOLAB_URI, (err, database) => {
    if (err) return console.log(err)
    db = database
    const port = process.env.PORT || 3000
    app.listen(port, () => {
        console.log('Listening on port ' + port)
    })
})

app.set('view engine', 'ejs')
app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.json())
app.use(express.static('public'))
app.locals._ = _;

app.use(function (req, res, next) {
    // Website you wish to allow to connect
    res.setHeader('Access-Control-Allow-Origin', '*')

    // Request methods you wish to allow
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE')

    // Request headers you wish to allow
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type')

    // Set to true if you need the website to include cookies in the requests sent
    // to the API (e.g. in case you use sessions)
    res.setHeader('Access-Control-Allow-Credentials', true)

    // Pass to next layer of middleware
    next()
})

function get_scores(query, cb) {
    db.collection('scores').find(query).sort({ score: -1 }).toArray((err, result) => {
        if (err) {
            console.log(err)
            return cb(err)
        }
        return cb(null, result)
    })
}

app.get('/', (req, res) => {
    get_scores({}, (err, result) => {
        if (err) return
        res.render('index.ejs', { scores: result })
    })
})

/*
app.get('/:seed', (req, res) => {
    const seed = parseInt(req.params.seed)
    // if (isNaN(seed)) return
    console.log('seed: ' + seed)
    const query = !isNaN(seed) ? { seed: seed } : {}
    get_scores(query, (err, result) => {
        console.log(err)
        console.log(result)
        if (err) return
        res.render('index.ejs', { scores: result })
    })
})

app.get('/:year/:month/:day/:game_mode/:game_count', (req, res) => {
    const year = parseInt(req.params.year)
    const month = parseInt(req.params.month)
    const day = parseInt(req.params.day)
    const game_mode = parseInt(req.params.game_mode)
    const game_count = parseInt(req.params.game_count)
    if (isNaN(year) || isNaN(month) || isNaN(day) || isNaN(game_mode) || isNaN(game_count)) return
    get_scores({
        year: year,
        month: month,
        day: day,
        game_mode: game_mode,
        game_count: game_count
    }, (err, result) => {
        if (err) return
        res.render('index.ejs', { scores: result })
    })
})
*/

app.post('/scores', (req, res) => {
    console.log(req.body);
    const seed = parseInt(req.body.seed);
    const score = parseInt(req.body.score);
    const year = parseInt(req.body.year);
    const month = parseInt(req.body.month);
    const day = parseInt(req.body.day);
    db.collection('scores').save({
        user_id: req.body.user_id,
        user_name: req.body.user_name,
        score: score,
        strive_goal: parseInt(req.body.strive_goal),
        seed: seed,
        year: year,
        month: month,
        day: day,
        game_mode: parseInt(req.body.game_mode),
        game_count: parseInt(req.body.game_count),
        actions: req.body.actions
    }, (err, result) => {
        if (err) console.log('Could not save score to database! Error: ' + err)

        get_scores({ seed: seed }, (err_load, result) => {
            if (err_load) console.log('Could not load scores from database! Error: ' + err)
            
            console.log('result: ' + JSON.stringify(result));

            var won_games = _.filter(result, function (res) { return score > res.score });
            var wins = won_games.length
            console.log('wins: ' + wins);

            var lost_games = _.filter(result, function (res) { return score < res.score });
            var losesToUsers = _.map(lost_games, function (res) { return res.user_id })

            console.log('losesToUsers: ' + JSON.stringify(losesToUsers));

            // update total score in the user collection
            db.collection('users').update({ user_id: req.body.user_id }, { $inc: { total_wins: wins } }, { upsert: true }) // add wins for this user
            db.collection('users').update({ user_id: { $in: losesToUsers } }, { $inc: { total_wins: 1 } }, { multi: true }) // increase wins for all users with greater scores

            // update daily score in the daily score collection
            db.collection('daily_wins').update({ user_id: req.body.user_id, year: year, month: month, day: day }, { $inc: { wins: wins } }, { upsert: true }) // add wins for this user
            db.collection('daily_wins').update({ user_id: { $in: losesToUsers }, year: year, month: month, day: day }, { $inc: { wins: 1 } }, { multi: true }) // increase wins for all users with greater scores

            res.json(result)
        })
    })
})

/*
for each seed:
    get all scores, sorted by score
    add points to user_id for all remaining items in scores list
sort user_id list by points
*/

app.get('/rank', (req, res) => {
    db.collection('users').find().sort({ total_wins: -1 }).toArray((err, result) => {
        if (err) {
            console.log(err)
            return cb(err)
        }

        return res.json(result)
    })
})

app.get('/rank/:user_id', (req, res) => {
    const user_id = req.params.user_id
    console.log('user_id: ' + user_id)
    if (isNaN(user_id)) return res.status(500).send('user id not specified')

    db.collection('users').find().sort({ total_wins: -1 }).toArray((err, result) => {
        if (err) {
            console.log(err)
            return cb(err)
        }

        const me = _.find(result, function (user) { return user.user_id == user_id; });

        // const rank = _.findIndex(result, function (user) { return user.user_id == user_id; }) // no tie breaking (ie. two users with same number of wins will get different rank)
        const rank = _.findIndex(result, function (user) { return user.total_wins == me.total_wins; }) // with tie breaking (ie. two users with same number of wins will get the same rank)
        return res.json({ rank: rank, players: result.length });
    })
})

// app.put('/scores', (req, res) => {
//     db.collection('scores')
//         .findOneAndUpdate({ name: 'Yoda' }, {
//             $set: {
//                 score: req.body.score,
//                 name: req.body.name
//             }
//         }, {
//                 sort: { _id: -1 },
//                 upsert: true
//             }, (err, result) => {
//                 if (err) return res.send(err)
//                 res.send(result)
//             })
// })

// app.delete('/scores', (req, res) => {
//     db.collection('scores').findOneAndDelete({ name: req.body.name }, (err, result) => {
//         if (err) return res.send(500, err)
//         res.send('A darth vadar quote got deleted')
//     })
// })
