export default async function postData(url='', data = {}) {
  const response = await fetch(url, {
    method: 'POST',
    cache: 'no-cache',
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/json'
    },
    redirect: 'follow',
    referrePolicy: 'no-referrer',
    body: JSON.stringify(data)
  });
  return response.json();
};