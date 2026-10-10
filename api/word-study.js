import { handleWordStudyRequest } from '../server/wordStudy.js'

export default function handler(request, response) {
  return handleWordStudyRequest(request, response, process.env.DEEPSEEK_API_KEY)
}
