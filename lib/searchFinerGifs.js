import axios from 'axios';
import shuffle from 'lodash.shuffle';

export default async function searchFinerGifs(q, tags) {
  const {data} = await axios.get(process.env.API_BASE_URL + '/search', {
    params: {q, size: tags && tags.length ? 100 : 1},
  });

  if (Array.isArray(data.results) && data.results.length > 1) {
    if (tags.includes('shuffle') || tags.includes('random')) {
      data.results = shuffle(data.results).slice(0, 1);
    }
  }

  return data;
}
