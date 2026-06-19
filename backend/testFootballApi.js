import dotenv from 'dotenv'
dotenv.config()
import axios from 'axios'

const KEY = process.env.FOOTBALL_DATA_KEY

try {
  const res = await axios.get('https://api.football-data.org/v4/matches', {
    headers: { 'X-Auth-Token': KEY },
    params: { status: 'IN_PLAY,PAUSED' },
  })
  console.log('OK — status:', res.status, '| live matches:', res.data.matches?.length)
  console.log('Rate limit remaining:', res.headers['x-requests-available-minute'])
} catch (err) {
  console.log('FAILED — status:', err.response?.status)
  console.log('Body:', JSON.stringify(err.response?.data))
  console.log('Rate limit remaining:', err.response?.headers['x-requests-available-minute'])
  console.log('Reset:', err.response?.headers['x-requestcounter-reset'])
}