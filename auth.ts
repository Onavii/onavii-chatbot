import NextAuth, { type DefaultSession } from 'next-auth'
import GitHubProvider from 'next-auth/providers/github'
import GoogleProvider from 'next-auth/providers/google'

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
    })
  ],
  callbacks: {
    jwt({ token, profile }) {
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
  }
  // pages: {
  //   signIn: '/sign-in' // overrides the next-auth default signin page https://authjs.dev/guides/basics/pages
  // }
})
