import { kv } from '@vercel/kv'
import { Message as VercelChatMessage, StreamingTextResponse } from 'ai'
import { Configuration, OpenAIApi } from 'openai-edge'

import { auth } from '@/auth'
import { nanoid } from '@/lib/utils'

import { MongoDBAtlasVectorSearch } from 'langchain/vectorstores/mongodb_atlas'
import { OpenAIEmbeddings } from 'langchain/embeddings/openai'
import { MongoClient } from 'mongodb'
import { ChatOpenAI } from 'langchain/chat_models/openai'
import { formatDocumentsAsString } from 'langchain/util/document'
import {
  StringOutputParser,
  BytesOutputParser
} from 'langchain/schema/output_parser'
import {
  RunnablePassthrough,
  RunnableSequence
} from 'langchain/schema/runnable'
import {
  ChatPromptTemplate,
  HumanMessagePromptTemplate,
  SystemMessagePromptTemplate
} from 'langchain/prompts'
import { PromptTemplate } from 'langchain/prompts'

//export const runtime = 'edge'

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY
})

//const openai = new OpenAIApi(configuration)

const formatMessage = (message: VercelChatMessage) => {
  return `${message.role}: ${message.content}`
}

export async function POST(req: Request) {
  const json = await req.json()
  const { messages: chatHistory, previewToken } = json
  const userId = (await auth())?.user.id

  if (!userId) {
    return new Response('Unauthorized', {
      status: 401
    })
  }

  if (previewToken) {
    configuration.apiKey = previewToken
  }

  const formattedPreviousMessages = chatHistory.slice(0, -1).map(formatMessage)
  const currentMessageContent = chatHistory[chatHistory.length - 1].content

  const client = new MongoClient(process.env.MONGODB_URL!) //TODO => move to middleware

  const namespace = 'Onavii.chatbot_sources'
  const [dbName, collectionName] = namespace.split('.')
  const collection = client.db(dbName).collection(collectionName)

  const chatModel = new ChatOpenAI({
    modelName: 'gpt-4',
    temperature: 0,
    streaming: true
  })

  const vectorStore = new MongoDBAtlasVectorSearch(new OpenAIEmbeddings(), {
    collection,
    indexName: 'default', // The name of the Atlas search index. Defaults to "default"
    textKey: 'embeddingsText', // The name of the collection field containing the raw content. Defaults to "text"
    embeddingKey: 'embeddings' // The name of the collection field containing the embedded text. Defaults to "embedding"
  })

  const vectorStoreRetriever = vectorStore.asRetriever()

  // Create a system & human prompt for the chat model
  // const SYSTEM_TEMPLATE = `Use the following pieces of context to answer the question at the end.
  // If you don't know the answer, just say that you don't know, don't try to make up an answer.
  // ----------------
  // {context}`

  const questionPrompt = PromptTemplate.fromTemplate(
    `Use the following pieces of context and user data  to answer the question at the end. If you don't know the answer, just say that you don't know, don't try to make up an answer. Use as much information from the context below as possible, if the context refers to studies, give credit to clinicaltrials.gov as a the source.
    ----------------
    USER DATA: {userData}
    ----------------
    CONTEXT: {context}
    ----------------
    CHAT HISTORY: {chatHistory}
    ----------------
    QUESTION: {question}
    ----------------
    Helpful Answer:`
  )

  // const messages = [
  //   SystemMessagePromptTemplate.fromTemplate(SYSTEM_TEMPLATE),
  //   HumanMessagePromptTemplate.fromTemplate('{question}')
  // ]
  //const prompt = ChatPromptTemplate.fromMessages(messages)

  const chain = RunnableSequence.from([
    {
      question: (input: { question: string; chatHistory?: string }) =>
        input.question,
      chatHistory: (input: { question: string; chatHistory?: string }) =>
        input.chatHistory ?? '',
      context: async (input: { question: string; chatHistory?: string }) => {
        const relevantDocs = await vectorStoreRetriever.getRelevantDocuments(
          input.question
        )
        const serialized = formatDocumentsAsString(relevantDocs)
        return serialized
      },
      userData: (input: { question: string; chatHistory?: string }) => {
        return `
          user's name is Nour Amer, they live in Calgary, Canada. They have been diagnosed with Duchenne Muscular Dystrophy
        `
      }
    },
    questionPrompt,
    chatModel,
    new BytesOutputParser()
  ])

  const stream = await chain.stream(
    {
      chatHistory: formattedPreviousMessages,
      question: currentMessageContent
    },
    {
      callbacks: [
        {
          async handleLLMEnd(output, runId, parentRunId, tags) {
            const title = json.messages[0].content.substring(0, 100)
            const id = json.id ?? nanoid()
            const createdAt = Date.now()
            const path = `/chat/${id}`

            const payload = {
              id,
              title,
              userId,
              createdAt,
              path,
              messages: [
                ...chatHistory,
                {
                  content: output.generations[0][0].text,
                  role: 'assistant'
                }
              ]
            }
            await kv.hmset(`chat:${id}`, payload)
            await kv.zadd(`user:chat:${userId}`, {
              score: createdAt,
              member: `chat:${id}`
            })
          }
        }
      ]
    }
  )

  return new StreamingTextResponse(stream)
}
