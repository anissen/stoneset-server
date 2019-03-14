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
app.locals._ = _

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
    db.collection('scores').find(query).sort({ strive_goal: -1, score: -1 }).toArray((err, result) => {
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
        res.render('index.ejs', { scores: result, show_all_scores: false })
    })
})

app.get('/today', (req, res) => {
    const now = new Date()
    get_scores({ year: now.getFullYear(), month: now.getMonth(), day: now.getDate() }, (err, result) => {
        if (err) return
        res.render('index.ejs', { scores: result, show_all_scores: true })
    })
})

app.get('/all', (req, res) => {
    get_scores({}, (err, result) => {
        if (err) return
        res.render('index.ejs', { scores: result, show_all_scores: true })
    })
})

app.get('/normal', (req, res) => {
    get_scores({ game_mode: 0 }, (err, result) => {
        if (err) return
        res.render('index.ejs', { scores: result, show_all_scores: true })
    })
})

app.get('/strive', (req, res) => {
    get_scores({ game_mode: 1 }, (err, result) => {
        if (err) return
        res.render('index.ejs', { scores: result, show_all_scores: true })
    })
})

app.get('/survival', (req, res) => {
    get_scores({ game_mode: 2 }, (err, result) => {
        if (err) return
        res.render('index.ejs', { scores: result, show_all_scores: true })
    })
})

app.get('/plays/:seed', (req, res) => {
    const seed = parseInt(req.params.seed)
    db.collection('scores').find({ seed: seed }).toArray((err, result) => {
        if (err) {
            console.log(err)
            return cb(err)
        }
        res.json({ plays: result.length })
    })
})

app.get('/rankpage', (req, res) => {
    db.collection('users').find().sort({ total_stars: -1, total_wins: -1 }).toArray((err, result) => {
        if (err) {
            console.log(err)
            return cb(err)
        }

        res.render('index.ejs', { scores: result, show_all_scores: true })
    })
})

app.post('/scores', (req, res) => {
    const user_id = req.body.user_id
    const user_name = req.body.user_name
    const seed = parseInt(req.body.seed)
    const score = parseInt(req.body.score)
    const strive_goal = parseInt(req.body.strive_goal)
    const year = parseInt(req.body.year)
    const month = parseInt(req.body.month)
    const day = parseInt(req.body.day)
    const game_mode = parseInt(req.body.game_mode)
    const game_count = parseInt(req.body.game_count)
    const actions = req.body.actions
    const total_score = parseInt(req.body.total_score || 0)
    const highest_journey_level_won = parseInt(req.body.highest_journey_level_won || 0)
    const highest_journey_score_won = parseInt(req.body.highest_journey_score_won || 0)
    db.collection('scores').save({
        user_id: user_id,
        user_name: user_name,
        score: score,
        strive_goal: strive_goal,
        seed: seed,
        year: year,
        month: month,
        day: day,
        game_mode: game_mode,
        game_count: game_count,
        actions: actions
    }, (err, result) => {
        if (err) console.log('Could not save score to database! Error: ' + err)

        get_scores({ seed: seed }, (err_load, result) => {
            if (err_load) console.log('Could not load scores from database! Error: ' + err)
            
            var won_games = _.filter(result, function (res) { return game_mode != 1 && score > res.score })
            var wins = won_games.length
            var winsOverUsers = _.map(won_games, function (res) { return res.user_id })

            var lost_games = _.filter(result, function (res) { return game_mode != 1 && score < res.score })
            var losses = lost_games.length
            var losesToUsers = _.map(lost_games, function (res) { return res.user_id })

            db.collection('users').findOne({ user_id: user_id }, (err, user) => {
                if (err) {
                    console.log(err)
                    return cb(err)
                }

                function get_accumulated_journey_stars(level) {
                    if (level < 0) return 0;
                    // journey level stars: [0, 1, 1, 1, 1, 3, 1, 1, 1, 1, 5, 2, 2, 2, 2, 10, 5, 5, 5, 5, 20, 10, 10, 10, 10, 30, 20, 20, 20, 20, 50, 40, 40, 40, 40, 70, 60, 60, 60, 60, 100]
                    // https://try.haxe.org/#0295f
                    const acc_points = [0, 1, 2, 3, 4, 7, 8, 9, 10, 11, 16, 18, 20, 22, 24, 34, 39, 44, 49, 54, 74, 84, 94, 104, 114, 144, 164, 184, 204, 224, 274, 314, 354, 394, 434, 504, 564, 624, 684, 744];
                    // const acc_points = [0, 1, 2, 3, 4, 9, 11, 13, 15, 17, 27, 32, 37, 42, 47, 67, 77, 87, 97, 107, 147, 167, 187, 207, 227, 277, 317, 357, 397, 437, 537]
                    if (level >= acc_points.length) return acc_points[acc_points.length - 1]
                    return acc_points[level]
                }

                const score_stars = Math.floor(total_score / 1000)
                const journey_stars = get_accumulated_journey_stars(highest_journey_level_won)

                // if the user does not exist, create a dummy user to be able to reuse the logic below
                if (!user) {
                    user = {}
                }

                const old_wins = (user.total_wins || 0)
                const new_wins = old_wins + wins
                const old_losses = (user.total_losses || 0)
                const new_losses = old_losses + losses
                const data = {
                    user_name: user_name,
                    total_score: total_score,
                    total_wins: new_wins,
                    total_losses: new_losses,
                    journey_stars: journey_stars,
                    score_stars: score_stars,
                    total_stars: new_wins + journey_stars + score_stars,
                    highest_journey_level_won: highest_journey_level_won,
                    highest_journey_score_won: highest_journey_score_won
                }
                //console.log(data)
                
                // update total score in the user collection
                db.collection('users').update({ user_id: user_id }, { $set: data }, { upsert: true }) // add wins for this 
            })

            // update total score in the user collection
            //db.collection('users').update({ user_id: user_id }, { $inc: { total_wins: wins }, $set: { user_name: user_name, total_score: total_score, journey_stars: journey_stars, score_stars: score_stars } }, { upsert: true }) // add wins for this user
            if (losesToUsers.length > 0) db.collection('users').update({ user_id: { $in: losesToUsers } }, { $inc: { total_wins: 1, total_stars: 1 } }, { multi: true }) // increase wins for all users with greater scores
            if (winsOverUsers.length > 0) db.collection('users').update({ user_id: { $in: winsOverUsers } }, { $inc: { total_losses: 1 } }, { multi: true }) // increase losses for all users with lesser scores

            // update daily score in the daily score collection
            //db.collection('daily_wins').update({ user_id: user_id, year: year, month: month, day: day }, { $inc: { wins: wins } }, { upsert: true }) // add wins for this user
            //db.collection('daily_wins').update({ user_id: { $in: lossesToUsers }, year: year, month: month, day: day }, { $inc: { losses: 1 } }, { multi: true }) // increase wins for all users with greater scores

            res.json(result)
        })
    })
})

app.post('/change_name', (req, res) => {
    const user_id = req.body.user_id
    const user_name = req.body.user_name
    if (!user_name || user_name.length < 2 || user_name.length > 12) {
        console.log('Invalid user name: ' + user_name)
        return
    }
    db.collection('scores').update({ user_id: user_id }, { $set: { user_name: user_name } }, { multi: true }, (err, result) => {
        if (err) console.log('Could not update user name in scores! Error: ' + err)

        db.collection('users').update({ user_id: user_id }, { $set: { user_name: user_name } }, (err, result) => {
            if (err) console.log('Could not update user name in user! Error: ' + err)

            res.json(err ? 'Error: ' + err : 'Name changed')
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
    db.collection('users').find().sort({ total_stars: -1, total_wins: -1 }).toArray((err, result) => {
        if (err) {
            console.log(err)
            return cb(err)
        }

        return res.json(result)
    })
})

app.get('/rank/:user_id', (req, res) => {
    const user_id = req.params.user_id
    if (isNaN(user_id)) return res.status(500).send('user id not specified')

    db.collection('users').find().sort({ total_stars: -1, total_wins: -1 }).toArray((err, result) => {
        if (err) {
            console.log(err)
            return res.json({})
        }

        const me = _.find(result, function (user) {
            return user.user_id == user_id
        })
        if (!me) {
            return res.json({
                rank: -1,
                players: result.length,
                total_wins: 0,
                total_losses: 0,
                total_stars: 0
            })
        }

        // const rank = _.findIndex(result, function (user) { return user.user_id == user_id }) // no tie breaking (ie. two users with same number of wins will get different rank)
        const rank = _.findIndex(result, function (user) {
            return user.total_stars == me.total_stars // with tie breaking (ie. two users with same number of wins will get the same rank)
        })

        return res.json({
            rank: rank,
            players: result.length,
            total_wins: me.total_wins,
            total_losses: me.total_losses,
            total_stars: me.total_stars
        })
    })
})

app.get('/strive_highscores', (req, res) => {
    db.collection('users').find().sort({ highest_journey_level_won: -1, highest_journey_score_won: -1 }).toArray((err, result) => {
        if (err) {
            console.log(err)
            return res.json({})
        }

        const strive_players = _.filter(result, function (r) {
            return r.highest_journey_level_won >= 0
        })

        return res.json(_.map(strive_players, function(p) {
            return {
                user_name: p.user_name,
                user_id: p.user_id,
                //count: p.user_id,
                highest_journey_level_won: p.highest_journey_level_won,
                highest_journey_score_won: p.highest_journey_score_won
            }
        }))
    })
})
