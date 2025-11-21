import { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { email, z } from 'zod'
import { env } from '~/lib/env'
import { prisma } from '~/lib/prisma'
import { sendEmail } from '~/utils/send-email'

export async function requestPasswordRecover(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().post(
    '/password/recover',
    {
      schema: {
        tags: ['auth'],
        summary: 'Request password recovery',
        body: z.object({
          email: email(),
        }),
        response: {
          201: z.null(),
        },
      },
    },
    async (request, reply) => {
      const { email } = request.body

      try {
        const user = await prisma.user.findUnique({
          where: { email },
        })

        if (!user) {
          return reply.status(201).send()
        }

        await prisma.token.deleteMany({
          where: {
            userId: user.id,
            type: 'PASSWORD_RECOVER',
          },
        })

        const { id: code } = await prisma.token.create({
          data: {
            type: 'PASSWORD_RECOVER',
            userId: user.id,
            expiresAt: new Date(Date.now() + 1000 * 60 * 60), // 1 hour
          }
        })

        const recoverLink = `${env.FRONTEND_URL}/auth/reset-password?code=${code}`

        const html = `
          <!DOCTYPE html>
          <html lang="en">
          <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Password Recovery</title>
          </head>
          <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                  <tr>
                      <td align="center" style="padding: 40px 0;">
                          <table role="presentation" style="width: 600px; border-collapse: collapse; background-color: #ffffff; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                              <!-- Header -->
                              <tr>
                                  <td style="padding: 40px 30px; text-align: center; background-color: #4CAF50;">
                                      <h1 style="margin: 0; color: #ffffff; font-size: 28px;">Password Recovery</h1>
                                  </td>
                              </tr>
                              <!-- Content -->
                              <tr>
                                  <td style="padding: 40px 30px;">
                                      <h2 style="margin: 0 0 20px 0; color: #333333; font-size: 22px;">Hello!</h2>
                                      <p style="margin: 0 0 20px 0; color: #666666; font-size: 16px; line-height: 1.6;">
                                          We received a request to reset the password for your account. If you did not make this request, please ignore this email.
                                      </p>
                                      <p style="margin: 0 0 30px 0; color: #666666; font-size: 16px; line-height: 1.6;">
                                          To reset your password, click the button below:
                                      </p>
                                      <!-- Button -->
                                      <table role="presentation" style="margin: 0 auto;">
                                          <tr>
                                              <td style="border-radius: 4px; background-color: #4CAF50;">
                                                  <a href="${recoverLink}" style="display: inline-block; padding: 16px 36px; font-size: 16px; color: #ffffff; text-decoration: none; border-radius: 4px; font-weight: bold;">
                                                      Reset Password
                                                  </a>
                                              </td>
                                          </tr>
                                      </table>
                                      <p style="margin: 30px 0 20px 0; color: #666666; font-size: 14px; line-height: 1.6;">
                                          Or copy and paste the following link into your browser:
                                      </p>
                                      <p style="margin: 0 0 20px 0; padding: 15px; background-color: #f8f8f8; border-left: 4px solid #4CAF50; word-break: break-all; font-size: 14px; color: #333333;">
                                          <a href="${recoverLink}" style="color: #4CAF50; text-decoration: none;">${recoverLink}</a>
                                      </p>
                                      <p style="margin: 0; color: #999999; font-size: 13px; line-height: 1.6;">
                                          <strong>Important:</strong> This link will expire in 1 hour for security reasons.
                                      </p>
                                  </td>
                              </tr>
                              <!-- Footer -->
                              <tr>
                                  <td style="padding: 30px; background-color: #f8f8f8; text-align: center; border-top: 1px solid #eeeeee;">
                                      <p style="margin: 0 0 10px 0; color: #999999; font-size: 13px;">
                                          If you did not request this change, please contact us immediately.
                                      </p>
                                      <p style="margin: 0; color: #999999; font-size: 12px;">
                                          © ${new Date().getFullYear()} Lync. All rights reserved.
                                      </p>
                                  </td>
                              </tr>
                          </table>
                      </td>
                  </tr>
              </table>
          </body>
          </html>
        `;

        await sendEmail(
          email,
          'Password Recovery',
          html
        )

        return reply.status(201).send()
      } catch (error) {
        request.log.error({ error }, 'Error generating password recover token')
        return reply.status(201).send()
      }
    },
  )
}
