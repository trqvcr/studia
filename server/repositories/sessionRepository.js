const supabase = require('../db')

function normalize(row) {
  return {
    id: row.id,
    userId: row.user_id,
    subject: row.subject,
    startTime: row.start_time,
    endTime: row.end_time,
    duration: row.duration,
    active: row.active
  }
}

async function findActiveByUserId(userId) {
  const { data, error } = await supabase
    .from('sessions').select().eq('user_id', userId).eq('active', true).single()
  if (error && error.code !== 'PGRST116') throw error
  return data ? normalize(data) : null
}

async function create({ userId, subject, startTime }) {
  const { data, error } = await supabase
    .from('sessions')
    .insert({ user_id: userId, subject, start_time: startTime, end_time: null, duration: null, active: true })
    .select().single()
  if (error) throw error
  return normalize(data)
}

async function stop(id, endTime, duration) {
  const { data, error } = await supabase
    .from('sessions')
    .update({ end_time: endTime, duration, active: false })
    .eq('id', id)
    .select().single()
  if (error) throw error
  return normalize(data)
}

async function findAllByUserId(userId) {
  const { data, error } = await supabase
    .from('sessions').select().eq('user_id', userId)
  if (error) throw error
  return data.map(normalize)
}

module.exports = { findActiveByUserId, create, stop, findAllByUserId }
