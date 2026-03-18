import { Helmet } from "react-helmet-async";

interface SEOProps {
  title?: string;
  description?: string;
  canonical?: string;
  ogImage?: string;
  ogType?: string;
  noindex?: boolean;
}

const SITE_NAME = "The WIP Meetup";
const DEFAULT_DESCRIPTION =
  "The longest-running web3 metaverse meetup since 2019. Builders, creators, and artists gather every Thursday at 12 PM PT in the metaverse. 3,700+ community members strong.";
const DEFAULT_OG_IMAGE = "https://thewipmeetup.com/images/og-social.png";
const SITE_URL = "https://thewipmeetup.com";

export const SEO = ({
  title,
  description = DEFAULT_DESCRIPTION,
  canonical,
  ogImage = DEFAULT_OG_IMAGE,
  ogType = "website",
  noindex = false,
}: SEOProps) => {
  const fullTitle = title ? `${title} | ${SITE_NAME}` : `${SITE_NAME} — The Longest-Running Web3 Metaverse Meetup`;
  const canonicalUrl = canonical ? `${SITE_URL}${canonical}` : undefined;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      {noindex && <meta name="robots" content="noindex,nofollow" />}
      {canonicalUrl && <link rel="canonical" href={canonicalUrl} />}

      {/* Open Graph */}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content={ogType} />
      <meta property="og:image" content={ogImage} />
      {canonicalUrl && <meta property="og:url" content={canonicalUrl} />}
      <meta property="og:site_name" content={SITE_NAME} />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:site" content="@theWIPmeetup" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />
    </Helmet>
  );
};
