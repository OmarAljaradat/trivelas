const http = require('http');

const getOptions = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/admin/settings',
  method: 'GET'
};

const req = http.request(getOptions, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log("GET Settings Response:");
    console.log(data);
    
    // Attempt to update marketing settings
    const settingsObj = JSON.parse(data);
    settingsObj.marketing = {
      bannerActive: true,
      bannerText: "🔥 TEST UPDATE BANNER",
      bannerStyle: "gold",
      wheelActive: true,
      socialProofActive: true
    };
    
    const postData = JSON.stringify(settingsObj);
    const postOptions = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/admin/settings',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };
    
    const postReq = http.request(postOptions, (postRes) => {
      let postDataResp = '';
      postRes.on('data', chunk => postDataResp += chunk);
      postRes.on('end', () => {
        console.log("\nPOST Settings Response:");
        console.log(postDataResp);
      });
    });
    
    postReq.write(postData);
    postReq.end();
  });
});

req.end();
