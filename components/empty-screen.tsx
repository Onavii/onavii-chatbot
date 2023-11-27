import { UseChatHelpers } from 'ai/react'

import { Button } from '@/components/ui/button'
import { ExternalLink } from '@/components/external-link'
import { IconArrowRight } from '@/components/ui/icons'

const exampleMessages = [
  {
    heading: 'Find ALS Specialists',
    message: `Can you recommend doctors in Canada who specialize in ALS?`
  },
  {
    heading: 'Explore DMD Trials',
    message: `What are the current clinical trials for Duchenne Muscular Dystrophy?`
  },
  {
    heading: 'Personalized Inquiry',
    message: `I have been diagnosed with the Mitochondrial Disease. What are the latest treatment options available?`
  }
]

export function EmptyScreen({ setInput }: Pick<UseChatHelpers, 'setInput'>) {
  return (
    <div className="mx-auto max-w-2xl px-4">
      <div className="rounded-lg border bg-background p-8">
        <h1 className="mb-2 text-lg font-semibold">
          Welcome to Onavii's AI assistant
        </h1>
        <p className="mb-2 leading-normal text-muted-foreground">
          Your expert guide for neuromuscular disease support and healthcare
          navigation. Designed to deliver precise and valuable insights for
          patients, caregivers, and NMD enthusiasts.
        </p>
        <p className="leading-normal text-muted-foreground">
          Here, you can start a conversation or try the following examples:
        </p>
        <div className="mt-4 flex flex-col items-start space-y-2">
          {exampleMessages.map((message, index) => (
            <Button
              key={index}
              variant="link"
              className="h-auto p-0 text-base"
              onClick={() => setInput(message.message)}
            >
              <IconArrowRight className="mr-2 text-muted-foreground" />
              {message.heading}
            </Button>
          ))}
        </div>
      </div>
    </div>
  )
}
