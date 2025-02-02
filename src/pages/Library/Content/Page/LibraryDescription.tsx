import { Fragment, useState } from 'react'
import { Link, useNavigate } from '@remix-run/react'
import {
  Button,
  Category,
  ConfirmModal,
  ContentStatistics,
  LinkifyText,
  ModerationStatus,
  UsefulStatsButton,
} from 'oa-components'
import { IModerationStatus } from 'oa-shared'
// eslint-disable-next-line import/no-unresolved
import { ClientOnly } from 'remix-utils/client-only'
import DifficultyLevel from 'src/assets/icons/icon-difficulty-level.svg'
import TimeNeeded from 'src/assets/icons/icon-time-needed.svg'
import { trackEvent } from 'src/common/Analytics'
import { useCommonStores } from 'src/common/hooks/useCommonStores'
import { TagList } from 'src/common/Tags/TagsList'
import { logger } from 'src/logger'
import { cdnImageUrl } from 'src/utils/cdnImageUrl'
import {
  buildStatisticsLabel,
  capitalizeFirstLetter,
  isAllowedToDeleteContent,
  isAllowedToEditContent,
} from 'src/utils/helpers'
import { Alert, Box, Card, Divider, Flex, Heading, Image, Text } from 'theme-ui'

import { ContentAuthorTimestamp } from '../../../common/ContentAuthorTimestamp/ContentAuthorTimestamp'
import { HowtoDownloads } from './LibraryDownloads'

import type { ILibrary, ITag, IUser } from 'oa-shared'

const DELETION_LABEL = 'Project marked for deletion'

interface IProps {
  howto: ILibrary.DB & { tagList?: ITag[] }
  loggedInUser: IUser | undefined
  commentsCount: number
  votedUsefulCount?: number
  verified?: boolean
  hasUserVotedUseful: boolean
  onUsefulClick: () => Promise<void>
}

const HowtoDescription = ({ howto, loggedInUser, ...props }: IProps) => {
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const navigate = useNavigate()

  const { stores } = useCommonStores()

  const handleDelete = async (_id: string) => {
    try {
      await stores.howtoStore.deleteHowTo(_id)
      trackEvent({
        category: 'How-To',
        action: 'Deleted',
        label: howto.title,
      })
      logger.debug(
        {
          category: 'How-To',
          action: 'Deleted',
          label: howto.title,
        },
        DELETION_LABEL,
      )

      navigate('/library')
    } catch (err) {
      logger.error(err)
      // at least log the error
    }
  }

  return (
    <Card>
      <Flex
        data-cy="how-to-basis"
        data-id={howto._id}
        className="howto-description-container"
        sx={{
          overflow: 'hidden',
          flexDirection: ['column-reverse', 'column-reverse', 'row'],
        }}
      >
        <Flex
          sx={{
            px: 4,
            py: 4,
            flexDirection: 'column',
            width: ['100%', '100%', `${(1 / 2) * 100}%`],
          }}
        >
          {howto._deleted && (
            <Text color="red" pl={2} mb={2} data-cy="how-to-deleted">
              * Marked for deletion
            </Text>
          )}
          <Flex sx={{ flexWrap: 'wrap', gap: '10px' }}>
            <ClientOnly fallback={<></>}>
              {() => (
                <>
                  {howto.moderation === IModerationStatus.ACCEPTED && (
                    <UsefulStatsButton
                      votedUsefulCount={props.votedUsefulCount}
                      hasUserVotedUseful={props.hasUserVotedUseful}
                      isLoggedIn={loggedInUser ? true : false}
                      onUsefulClick={props.onUsefulClick}
                    />
                  )}
                </>
              )}
            </ClientOnly>
            {/* Check if logged in user is the creator of the project OR a super-admin */}
            {loggedInUser && isAllowedToEditContent(howto, loggedInUser) && (
              <Link to={'/library/' + howto.slug + '/edit'}>
                <Button type="button" variant="primary" data-cy="edit">
                  Edit
                </Button>
              </Link>
            )}

            {loggedInUser && isAllowedToDeleteContent(howto, loggedInUser) && (
              <Fragment key={'how-to-delete-action'}>
                <Button
                  type="button"
                  data-cy="How-To: delete button"
                  variant={'secondary'}
                  icon="delete"
                  disabled={howto._deleted}
                  onClick={() => setShowDeleteModal(true)}
                >
                  Delete
                </Button>

                <ConfirmModal
                  key={howto._id}
                  isOpen={showDeleteModal}
                  message="Are you sure you want to delete this project?"
                  confirmButtonText="Delete"
                  handleCancel={() => setShowDeleteModal(false)}
                  handleConfirm={() => handleDelete && handleDelete(howto._id)}
                />
              </Fragment>
            )}
          </Flex>
          {howto.moderatorFeedback &&
          howto.moderation !== IModerationStatus.ACCEPTED ? (
            <Alert
              variant="info"
              sx={{
                my: 2,
              }}
            >
              <Box
                sx={{
                  textAlign: 'left',
                }}
              >
                <Heading as="p" variant="small" mb={2}>
                  Moderator Feedback
                </Heading>
                <Text sx={{ fontSize: 2 }}>{howto.moderatorFeedback}</Text>
              </Box>
            </Alert>
          ) : null}
          <Box mt={3} mb={2}>
            <Flex sx={{ justifyContent: 'space-between', flexWrap: 'wrap' }}>
              <Flex sx={{ flexDirection: 'column' }}>
                <ContentAuthorTimestamp
                  userName={howto._createdBy}
                  countryCode={howto.creatorCountry}
                  created={howto._created}
                  modified={howto._contentModifiedTimestamp || howto._modified}
                  action="Published"
                />
                {howto.category && (
                  <Category
                    category={howto.category}
                    sx={{ fontSize: 2, mt: 2 }}
                  />
                )}
                <Heading
                  as="h1"
                  mt={howto.category ? 1 : 2}
                  mb={1}
                  data-cy="how-to-title"
                >
                  {/* HACK 2021-07-16 - new howtos auto capitalize title but not older */}
                  {capitalizeFirstLetter(howto.title)}
                </Heading>
                <Text
                  variant="paragraph"
                  sx={{ whiteSpace: 'pre-line' }}
                  data-cy="how-to-description"
                >
                  <LinkifyText>{howto.description}</LinkifyText>
                </Text>
              </Flex>
            </Flex>
          </Box>

          <Flex mt="4">
            <Flex mr="4" sx={{ flexDirection: ['column', 'row', 'row'] }}>
              <Image
                loading="lazy"
                src={TimeNeeded}
                height="16"
                width="16"
                mr="2"
                mb="2"
              />
              {howto.time}
            </Flex>
            <Flex
              mr="4"
              sx={{ flexDirection: ['column', 'row', 'row'] }}
              data-cy="difficulty-level"
            >
              <Image
                loading="lazy"
                src={DifficultyLevel}
                height="15"
                width="16"
                mr="2"
                mb="2"
              />
              {howto.difficulty_level}
            </Flex>
          </Flex>
          <ClientOnly fallback={<></>}>
            {/* TODO: remove ClientOnly when we have a Tags API which we can on the loader - need it now because tags only load client-side which causes a html mismatch error */}
            {() => (
              <>
                <TagList tags={howto.tags} />
                <HowtoDownloads howto={howto} loggedInUser={loggedInUser} />
              </>
            )}
          </ClientOnly>
        </Flex>
        <Box
          sx={{
            width: ['100%', '100%', `${(1 / 2) * 100}%`],
            position: 'relative',
          }}
        >
          <Box
            sx={{
              overflow: 'hidden',
            }}
          >
            <Box
              sx={{
                width: '100%',
                height: '0',
                pb: '75%',
              }}
            ></Box>
            <Box
              sx={{
                position: 'absolute',
                top: '0',
                bottom: '0',
                left: '0',
                right: '0',
              }}
            >
              {howto.cover_image && (
                // 3407 - AspectImage creates divs that can mess up page layout,
                // so using Image here instead and recreating the div layout
                // that was created by AspectImage
                <Image
                  loading="lazy"
                  src={cdnImageUrl(howto.cover_image.downloadUrl)}
                  sx={{
                    objectFit: 'cover',
                    height: '100%',
                    width: '100%',
                  }}
                  crossOrigin=""
                  alt={howto.cover_image_alt ?? 'project cover image'}
                />
              )}
            </Box>
          </Box>
          {howto.moderation !== IModerationStatus.ACCEPTED && (
            <ModerationStatus
              status={howto.moderation}
              contentType="howto"
              sx={{ top: 0, position: 'absolute', right: 0 }}
            />
          )}
        </Box>
      </Flex>
      <Divider
        sx={{
          m: 0,
          border: '1px solid black',
        }}
      />
      <ContentStatistics
        statistics={[
          {
            icon: 'view',
            label: buildStatisticsLabel({
              stat: howto.total_views,
              statUnit: 'view',
              usePlural: true,
            }),
          },
          {
            icon: 'star',
            label: buildStatisticsLabel({
              stat: props.votedUsefulCount || 0,
              statUnit: 'useful',
              usePlural: false,
            }),
          },
          {
            icon: 'comment',
            label: buildStatisticsLabel({
              stat: props.commentsCount || 0,
              statUnit: 'comment',
              usePlural: true,
            }),
          },
          {
            icon: 'update',
            label: buildStatisticsLabel({
              stat: howto.steps.length,
              statUnit: 'step',
              usePlural: true,
            }),
          },
        ]}
      />
    </Card>
  )
}

export default HowtoDescription
