const WebSocket = require('ws')
const http = require('http')
const express = require('express')
const fs = require('fs')
const path = require('path')
const basicauth = require('basic-auth')
const opcauth = require('../server-resources/opcauth').opcauth
const FileRegex = require('file-regex')

const app = express()
app.use(express.static('./ktanemod-remote-math-module/main/'))
app.get('/logs/api', (req, res) => {
  getLogFiles(req, res)
})
app.get('/logs/api/:year', (req, res) => {
  getLogFiles(req, res, ...[req.params.year])
})
app.get('/logs/api/:year/:month', (req, res) => {
  getLogFiles(req, res, ...[req.params.year, req.params.month])
})
app.get('/logs/api/:year/:month/:day', (req, res) => {
  getLogFiles(req, res, ...[req.params.year, req.params.month, req.params.day])
})
app.get('/logs/api/:year/:month/:day/:code', (req, res) => {
  getLogFiles(req, res, ...[req.params.year, req.params.month, req.params.day, req.params.code])
})
app.get('/logs/api/:year/:month/:day/:code/:uuid', (req, res) => {
  getLogFiles(req, res, ...[req.params.year, req.params.month, req.params.day, req.params.code, req.params.uuid])
})
app.get('/logs', (req, res) => {
  res.sendFile(`/${__dirname}/ktanemod-remote-math-module/main/logs.html`)
})
app.get('/logs.js', (req, res) => {
  res.sendFile(`/${__dirname}/ktanemod-remote-math-module/main/logs.js`)
})

function getLogFiles(req, res, year = null, month = null, day = null, code = null, uuid = null) {
  if (year != null && /^([0-9]{4}|\*)$/.exec(year) == null) return res.end('[]')
  if (month != null && /^([0-9]{1,2}|\*)$/.exec(month) == null) return res.end('[]')
  if (day != null && /^([0-9]{1,2}|\*)$/.exec(day) == null) return res.end('[]')
  if (code != null && /^([A-Z]{6}|\*)$/.exec(code) == null) return res.end('[]')
  if (uuid != null && /^([A-Z0-9]{8}|\*)$/.exec(uuid) == null) return res.end('[]')
  var queryStr = [year, month, day, code, uuid]
  var a = queryStr.map(x => (x == null ? '*' : x))
  var z = a.indexOf('*')
  var b = z == -1 ? [...a] : a.slice(0, z)
  var dirpath = 'ktanemod-remote-math-module/logs'
  var filename = `log-${a[0]}-${a[1]}-${a[2]}-${a[3]}-${a[4]}.log`
  if (b.length == 5) {
    if (fs.existsSync(`${dirpath}/${filename}`)) {
      res.sendFile(`/${__dirname}/${dirpath}/${filename}`)
    } else {
      res.status(404).send('404 Missing log file')
    }
    return
  }
  if (!fs.existsSync(dirpath)) {
    return res.end('[]')
  }
  var x = new RegExp(escapeRegExp(filename).replace(/\\\*/g, '.+'))
  console.log(`Searching for ${x}`)
  FileRegex(`${__dirname}/${dirpath}`, x).then(function (files) {
    var isFileExists = x => fs.existsSync(`${__dirname}/${dirpath}/${x.file}`) && fs.lstatSync(`${__dirname}/${dirpath}/${x.file}`).isFile()
    var relpath = `${__dirname}/${dirpath}`
    var f = files.filter(x => isFileExists(x)).map(x => x.file.replace(/^log-([0-9]{4})-([0-9]{1,2})-([0-9]{1,2})-([A-Z]{6})-([A-Z0-9]{8})\.log$/, '$1/$2/$3/$4/$5'))
    res.send(f)
  })
}

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') // $& means the whole matched string
}

class PuzzleLogger {
  constructor(puzzle) {
    this.lines = []
    this.puzzle = puzzle
  }

  log(s) {
    this.lines.push(s)
  }

  save() {
    var d = this.puzzle.date
    var dirpath = `${__dirname}/ktanemod-remote-math-module/logs`
    if (!fs.existsSync(dirpath)) {
      fs.mkdirSync(dirpath, { recursive: true })
    }
    var writeStream = fs.createWriteStream(`${dirpath}/log-${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}-${this.puzzle.code}-${this.puzzle.uuid}.log`)
    for (var i = 0; i < this.lines.length; i++) {
      writeStream.write(this.lines[i] + '\n')
    }
    writeStream.end()
  }
}

const server = http.createServer(app)
server.listen(5001, () => {
  console.log('KTaNE mod Remote Math server listening on port 5001')
})

const fruitnumbers = [
  [88, 1, 48, 75, 31, 8],
  [84, 42, 62, 21, 91, 17],
  [56, 29, 12, 53, 11, 81],
  [32, 5, 19, 38, 25, 64],
  [44, 61, 20, 92, 13, 4],
  [34, 50, 87, 22, 54, 19],
]

function recordLog(p, a) {
  p.logger.log(a)
}

function checkSolution(puzzle, sln, instantSolve = false) {
  sln[1] = parseInt(sln[1])
  sln[2] = parseInt(sln[2])
  sln[4] = parseInt(sln[4])
  // Solution :: [1] Left fruit :: [2] Right fruit :: [3] Display content :: [4] Status light colour
  // Fruit numbers
  /* f1 = defuser's top
   * f2 = defuser's right
   * f3 = expert's left
   * f4 = expert's right
   */

  f1 = fruitnumbers[puzzle.fruits[0]][puzzle.fruits[2]]
  f2 = fruitnumbers[puzzle.fruits[1]][puzzle.fruits[3]]
  f3 = fruitnumbers[puzzle.fruits[4]][puzzle.fruits[6]]
  f4 = fruitnumbers[puzzle.fruits[5]][puzzle.fruits[7]]

  // Step 1
  s1a = f1 * 13 + (puzzle.fruits[0] == puzzle.fruits[2] ? 21 : 0) - puzzle.ports
  s1b = Math.abs(Math.floor(s1a / f4))
  s1c = s1b % 20

  // Step 2
  s2a = f4 * f2 - (puzzle.fruits[4] == puzzle.fruits[6] && puzzle.fruits[5] == puzzle.fruits[7] ? 54 : 0)
  if (puzzle.batteries != 0) s2b = Math.abs(Math.floor(s2a / puzzle.batteries))
  else s2b = Math.abs(Math.floor(s2a))
  s2c = (s2b % 20) + 5

  // Step 3
  s3a = (s1c + s2c).toString() + '+' + f1.toString() + (puzzle.batteries > 5 ? '−' : '×') + f2.toString() + '='
  s3b = s1c + s2c + (puzzle.batteries > 5 ? f1 - f2 : f1 * f2)
  s3c = s3a + s3b.toString().replace('-', '−')

  // Step 4
  s4a = sln[4].toString() == puzzle.ctext[0].toString() || sln[4].toString() == puzzle.ctext[1].toString()

  recordLog(puzzle, 'Correct Answers:')
  recordLog(puzzle, '  Step 1: ' + s1c.toString())
  recordLog(puzzle, '  Step 2: ' + s2c.toString())
  recordLog(puzzle, '  Step 3: ' + s3c.toString())
  recordLog(puzzle, '  Step 4: ' + puzzle.ctext[0].toString() + ' or ' + puzzle.ctext[1].toString())

  recordLog(puzzle, 'Your Answers:')
  recordLog(puzzle, '  Step 1: ' + (instantSolve ? s1c.toString() : sln[1].toString()))
  recordLog(puzzle, '  Step 2: ' + (instantSolve ? s2c.toString() : sln[2].toString()))
  recordLog(puzzle, '  Step 3: ' + (instantSolve ? s3c.toString() : sln[3].toString()))
  recordLog(puzzle, '  Step 4: ' + (instantSolve ? puzzle.ctext[0].toString() : sln[4].toString()))

  c1 = s1c == sln[1]
  c2 = s2c == sln[2]
  c3 = s3c == sln[3]
  c4 = s4a

  recordLog(puzzle, 'Checking Answers:')
  recordLog(puzzle, '  Step 1: ' + c1.toString())
  recordLog(puzzle, '  Step 2: ' + c2.toString())
  recordLog(puzzle, '  Step 3: ' + c3.toString())
  recordLog(puzzle, '  Step 4: ' + c4.toString())

  return instantSolve || (c1 && c2 && c3 && c4)
}

const wss = new WebSocket.Server({
  server: server,
  perMessageDeflate: {
    zlibDeflateOptions: {
      chunkSize: 1024,
      memLevel: 7,
      level: 3,
    },
    zlibInflateOptions: {
      chunkSize: 10 * 1024,
    },
    clientNoContextTakeover: true,
    serverNoContextTakeover: true,
    serverMaxWindowBits: 10,
    concurrencyLimit: 10,
    threshold: 1024,
  },
})

var used_ids = []

function makeid(length, chars = null) {
  var result = ''
  if (chars == null) chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  for (var i = 0; i < length; i++) {
    result += chars[Math.floor(Math.random() * chars.length)]
  }
  return result
}

class JoinedConnection {
  constructor() {
    this.code = ''
    this.uuid = ''
    this.ignoremode = false
    this.stephanie = null
    this.sophia = []
    this.twitch_plays = false
    this.tp_code = '000'
  }
}

wss.on('connection', function connection(ws) {
  ws.my_type = null
  ws.my_puzzle = null

  ws.my_puzzle_connected = false
  ws.on('message', data => {
    if (ws.my_type == null) {
      if (data == 'pong') return
      if (data == 'stephanie') {
        ws.isConnected = true
        ws.my_type = 'module'
        var a = new JoinedConnection()
        a.code = makeid(6)
        a.uuid = makeid(8)
        a.date = new Date()
        a.logger = new PuzzleLogger(a)
        a.stephanie = ws
        ws.my_puzzle = a
        ws.my_puzzle.ctext = [0, 0].map(x => Math.floor(Math.random() * 5))
        used_ids.push(a)
        ws.send('ClientSelected')
        ws.send('PuzzleCode::' + a.code)
        ws.send(`PuzzleLog::${a.date.getFullYear()}/${a.date.getMonth() + 1}/${a.date.getDate()}/${a.code}/${a.uuid}`)
        recordLog(a, 'Module ID: ' + a.code)
      } else if (data == 'sophia') {
        ws.isConnected = true
        ws.my_puzzle_tp = false
        ws.my_type = 'website'
        ws.send('ClientSelected')
      }
    } else if (ws.my_type == 'website') {
      if (ws.my_puzzle_connected) {
        if (data == 'PuzzleStrike') {
          ws.my_puzzle.logger.log('Sending strike')
          ws.my_puzzle.stephanie.send('PuzzleStrike')
        }
        // Left fruit :: Right fruit :: Display content :: Status light colour
        reg = /^PuzzleSolution\:\:([0-9]+)\:\:([0-9]+)\:\:([0-9−+÷×=]+)\:\:([0-5])$/.exec(data)
        if (reg !== null) {
          if (checkSolution(ws.my_puzzle, reg)) {
            console.log('Valid solution sent: ' + data)
            ws.my_puzzle.logger.log('Correct solution')
            ws.my_puzzle.stephanie.send('PuzzleLog::CorrectSolution')
            ws.my_puzzle.logger.log('Sending solve')
            ws.my_puzzle.stephanie.send('PuzzleComplete')
            ws.my_puzzle.sophia.forEach(x => {
              x.send('PuzzleComplete')
              x.close()
            })
          } else {
            console.log('Invalid solution sent: ' + data)
            ws.my_puzzle.logger.log('Incorrect solution')
            ws.my_puzzle.stephanie.send('PuzzleLog::IncorrectSolution')
            ws.my_puzzle.logger.log('Sending strike')
            ws.my_puzzle.stephanie.send('PuzzleStrike')
            ws.my_puzzle.sophia.forEach(x => {
              x.send('PuzzleStrike')
            })
          }
        }
      } else {
        reg = /^PuzzleConnect\:\:([A-Z]{6})$/.exec(data)
        if (reg !== null) {
          var my_code = reg[1]
          var f = used_ids.filter(x => x.code == my_code)
          if (f.length == 1) {
            if (f[0].ignoremode) {
              ws.send('PuzzleInvalid')
              ws.close()
              return
            }
            ws.my_puzzle = f[0]
            t = ws.my_puzzle.twitch_plays
            ws.my_puzzle_connected = !t
            ws.my_puzzle_tp = t

            ws.my_puzzle.sophia.push(ws)
            ws.tp_code = makeid(3, '0123456789')
            var m = ws.my_puzzle.sophia.map(x => x.tp_code.toString())
            while (m.includes(ws.tp_code.toString())) ws.tp_code = makeid(3, '0123456789')
            ws.send('PuzzleConnected')
            ws.send('PuzzleFruits::' + ws.my_puzzle.fruits.slice(4).join('::'))
            ws.send('PuzzleFruitText::' + ws.my_puzzle.ctext.join('::'))
            if (t) {
              ws.my_puzzle.stephanie.send('PuzzleTwitchCode::' + ws.tp_code)
              ws.send('PuzzleTwitchCode::' + ws.my_puzzle.twitch_id + '::' + ws.tp_code)
            }
          } else {
            ws.send('PuzzleInvalid')
          }
        }
      }
    } else if (ws.my_type == 'module') {
      if (data == 'pong') {
        ws.my_puzzle.lastPing = new Date().getTime()
        return
      }
      reg = /^PuzzleTwitchPlaysMode::([0-9]+)$/.exec(data)
      if (reg !== null) {
        ws.my_puzzle.twitch_plays = true
        ws.my_puzzle.twitch_id = reg[1]
      }
      reg = /^PuzzleActivateTwitchCode\:\:([0-9]{3})$/.exec(data)
      if (reg !== null) {
        ws.my_puzzle.sophia.forEach(x => {
          if (x.tp_code.toString() == reg[1].toString()) {
            x.my_puzzle_tp = false
            x.my_puzzle_connected = true
            x.send('PuzzleActivateTwitchPlays')
          }
        })
      }
      reg = /^PuzzleFruits\:\:([0-5])\:\:([0-5])\:\:([0-5])\:\:([0-5])\:\:([0-5])\:\:([0-5])\:\:([0-5])\:\:([0-5])$/.exec(data)
      if (reg !== null) {
        ws.my_puzzle.fruits = [reg[1], reg[2], reg[3], reg[4], reg[5], reg[6], reg[7], reg[8]].map(x => parseInt(x))
        var puzzle = ws.my_puzzle
        var fruitNames = ['Apple', 'Melon', 'Orange', 'Pear', 'Pineapple', 'Strawberry']
        var f = ws.my_puzzle.fruits
          .map(x => fruitNames[x])
          .map(
            x =>
              x +
              Array(10 - x.length)
                .fill(' ')
                .join('')
          )
        var f1 = fruitnumbers[puzzle.fruits[0]][puzzle.fruits[2]]
        var f2 = fruitnumbers[puzzle.fruits[1]][puzzle.fruits[3]]
        var f3 = fruitnumbers[puzzle.fruits[4]][puzzle.fruits[6]]
        var f4 = fruitnumbers[puzzle.fruits[5]][puzzle.fruits[7]]
        var z = [f1, f2, f3, f4]
          .map(x => x.toString())
          .map(x => x + Array(6 - x.length).fill(' ').join(''))
        var table =
          'Fruits: +---------------+------------+------------+--------+\n' +
          '        | Position      | Image      | Text       | Number |\n' +
          `        | Defuser Top   | ${f[0]} | ${f[2]} | ${z[0]} |\n` +
          `        | Defuser Right | ${f[1]} | ${f[3]} | ${z[1]} |\n` +
          `        | Expert Left   | ${f[4]} | ${f[6]} | ${z[2]} |\n` +
          `        | Expert Right  | ${f[5]} | ${f[7]} | ${z[3]} |\n` +
          '        +---------------+------------+------------+--------+'
        recordLog(puzzle, table)
        return
      }
      reg = /^BombDetails\:\:([0-9]+)\:\:([0-9]+)$/.exec(data)
      if (reg !== null) {
        ws.my_puzzle.batteries = parseInt(reg[1])
        ws.my_puzzle.ports = parseInt(reg[2])
        recordLog(ws.my_puzzle, 'Batteries: ' + ws.my_puzzle.batteries.toString())
        recordLog(ws.my_puzzle, 'Ports: ' + ws.my_puzzle.ports.toString())
        return
      }
    }
  })
  ws.on('close', data => {
    ws.isConnected = false
    if (ws.my_puzzle != null && ws.my_type != null && ws.my_type == 'module') {
      ws.my_puzzle.sophia.forEach(x => {
        if (x.isConnected) {
          x.send('PuzzleDisconnected')
          x.close()
        }
      })
      ws.my_puzzle.logger.log('KTaNE Module disconnected')
      ws.my_puzzle.logger.save()
      used_ids.splice(used_ids.indexOf(ws.my_puzzle), 1)
    }
  })
})

setInterval(() => {
  used_ids.forEach(x => {
    if (x.lastPing != undefined) {
      if (new Date().getTime() - x.lastPing > 7000) {
        x.sophia.forEach(y => {
          if (y.isConnected) {
            y.send('PuzzleDisconnected')
            y.close()
          }
        })
        if (x.isConnected) x.stephanie.close()
      }
    }
    if (x.isConnected) {
      x.stephanie.send('ping')
      x.sophia.forEach(y => {
        if (y.isConnected) y.send('ping')
      })
    }
  })
}, 5000)

module.exports = {
  start: () => {},
}
