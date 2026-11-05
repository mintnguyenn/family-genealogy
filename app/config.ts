import { getSiteUrl } from '@/lib/siteUrl'

const config = {
  siteName: process.env.SITE_NAME || 'Suối Nguồn Yêu Thương',
  // Shown under the icon when the app is installed on a phone's home screen.
  shortName: process.env.SHORT_NAME?.trim() || 'Gia Phả',
  siteUrl: getSiteUrl()
}

export default config
