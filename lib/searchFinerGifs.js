import axios from 'axios';

export default async function searchFinerGifs(query) {
  const {data} = await axios.get(process.env.API_BASE_URL + '/search', {
    params: {q: query, size: 1},
  });

  return data;
}
