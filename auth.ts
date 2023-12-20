import NextAuth, { type DefaultSession } from 'next-auth'
import GitHubProvider from 'next-auth/providers/github'
import GoogleProvider from 'next-auth/providers/google'
import CredentialsProvider from 'next-auth/providers/credentials'

declare module 'next-auth' {
  interface Session {
    user: {
      /** The user's id. */
      id: string
    } & DefaultSession['user']
  }
}

export const {
  handlers: { GET, POST },
  auth
  //CSRF_experimental // will be removed in future
} = NextAuth({
  providers: [
    GitHubProvider({
      clientId: process.env.AUTH_GITHUB_ID,
      clientSecret: process.env.AUTH_GITHUB_SECRET
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      authorization: {
        params: {
          prompt: 'consent',
          access_type: 'offline',
          response_type: 'code'
        }
      }
    }),
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        username: {
          label: 'Username',
          type: 'text',
          placeholder: 'enter you username'
        },
        password: {
          label: 'Password',
          type: 'password',
          placeholder: 'enter your password'
        }
      },
      async authorize(credentials) {
        const sampleUser = {
          id: '42',
          name: 'Sample-User',
          //username: process.env.SAMPLE_USER_USERNAME,
          password: process.env.SAMPLE_USER_PASSWORD
        }

        if (
          credentials?.username === sampleUser.name &&
          credentials?.password === sampleUser.password
        ) {
          return sampleUser
        } else {
          return null
        }
      }
    })
  ],
  callbacks: {
    jwt({ token, profile }) {
      console.log('token', token)
      console.log('profile', profile)
      if (profile) {
        console.log('hey')
        token.id = profile.id
        token.image = profile.avatar_url || profile.picture
        console.log('token', token)
      }
      return token
    },
    authorized({ auth }) {
      console.log('user', auth)
      return !!auth?.user // this ensures there is a logged in user for -every- request
    },
    async redirect({ url, baseUrl }) {
      return baseUrl
    }
  },
  session: {
    strategy: 'jwt'
  }
  // pages: {
  //   signIn: '/sign-in' // overrides the next-auth default signin page https://authjs.dev/guides/basics/pages
  // }
})
