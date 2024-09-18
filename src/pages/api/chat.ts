import { NextApiRequest, NextApiResponse, } from 'next';
import OpenAI from 'openai';

// Initialize OpenAI client with API key
const openai = new OpenAI({
   apiKey: process.env.OPENAI_API_KEY || 'your-api-key',
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
   if (req.method !== 'POST') {
      return res.status(405).json({ message: 'Method Not Allowed' });
   }

   const { question } = req.body;

   res.setHeader('Content-Type', 'text/event-stream');
   res.setHeader('Cache-Control', 'no-cache');
   res.setHeader('Connection', 'keep-alive');

   try {
      // Create chat completion stream
      const stream = await openai.chat.completions.create({
         model: 'gpt-3.5-turbo',
         messages: [{ role: 'user', content: question }],
         stream: true,
      });

      // Stream response chunks
      for await (const chunk of stream) {
         const content = chunk.choices[0]?.delta?.content || '';
         res.write(`data: ${content}\n\n`);
      }

      // End the stream
      res.write('data: [DONE]\n\n');
      res.end();
   } catch (error) {
      console.error('Error calling OpenAI API:', error);
      res.status(500).json({ error: 'An error occurred while generating the response' });
   }
}
