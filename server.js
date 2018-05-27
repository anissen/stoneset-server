const express = require('express')
const app = express()
const bodyParser = require('body-parser')
const MongoClient = require('mongodb').MongoClient
const secrets = require('./secrets')

var db

MongoClient.connect(process.env.MONGOLAB_URI, (err, database) => {
    if (err) return console.log(err)
    db = database
    const port = process.env.PORT || 3000;
    app.listen(port, () => {
        console.log('Listening on port ' + port)
    })
})

app.set('view engine', 'ejs')
app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.json())
app.use(express.static('public'))

function get_scores(query, cb) {
    db.collection('scores').find(query).sort({ score: 1 }).toArray((err, result) => {
        if (err) {
            console.log(err)
            return cb(err)
        }
        return cb(null, result)
    })
}

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
        if (err) return;
        res.render('index.ejs', { scores: result })
    })
})

app.get('/:seed', (req, res) => {
    const seed = parseInt(req.params.seed)
    if (isNaN(seed)) return
    get_scores({ seed: seed }, (err, result) => {
        if (err) return;
        res.render('index.ejs', { scores: result })
    })
})

app.post('/scores', (req, res) => {
    db.collection('scores').save({
        user_id: parseInt(req.body.user_id),
        score: parseInt(req.body.score),
        seed: parseInt(req.body.seed),
        year: parseInt(req.body.year),
        month: parseInt(req.body.month),
        day: parseInt(req.body.day),
        game_mode: parseInt(req.body.game_mode),
        game_count: parseInt(req.body.game_count),
        actions: req.body.actions
    }, (err, result) => {
        if (err) return console.log(err)
        console.log('saved to database')
        res.redirect('/')
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
