const axios = require('axios');

async function test() {
  try {
    const loginRes = await axios.post(`https://tnp-attendance-system.onrender.com/auth/login`, {
      email: 'tnp@iiitsurat.ac.in', // Admin
      password: 'admin'
    });
    const token = loginRes.data.token;
    
    // Attempt to mark a record
    const recordsToMark = [{
      date: '12-Apr-2026',
      subject: 'CS(ECE)',
      roll: 'UI23CS16',
      name: 'bvsf',
      reason: 'OA'
    }];
    console.log('Sending POST to mark records...');
    const markRes = await axios.post(`https://tnp-attendance-system.onrender.com/attendance/mark`, 
      { records: recordsToMark },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    console.log('Mark Response:', markRes.data);

    // Let's fetch it immediately after
    const attRes = await axios.get(`https://tnp-attendance-system.onrender.com/attendance?subject=CS(ECE)`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('Unprocessed records count:', attRes.data.length);
  } catch (err) {
    console.error('Error:', err.response ? err.response.data : err.message);
  }
}

test();
