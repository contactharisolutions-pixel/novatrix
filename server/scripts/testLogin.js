const axios = require('axios')

async function testLogin() {
  try {
    console.log('Testing login with admin@novatrix.vip / Admin@Novatrix2024!')
    const res = await axios.post('http://localhost:5000/api/admin/auth/login', {
      email: 'admin@novatrix.vip',
      password: 'Admin@Novatrix2024!'
    })
    console.log('Login Success!')
    console.log('Data:', JSON.stringify(res.data, null, 2))
  } catch (err) {
    console.log('Login Failed!')
    if (err.response) {
      console.log('Status:', err.response.status)
      console.log('Error:', err.response.data)
    } else {
      console.log('Error Message:', err.message)
    }
  }
}

testLogin()
