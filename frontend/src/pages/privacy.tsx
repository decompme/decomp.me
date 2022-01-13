import Link from "next/link"

import Footer from "../components/Footer"
import Nav from "../components/Nav"
import PageTitle from "../components/PageTitle"

import styles from "./privacy.module.scss"

export default function PrivacyPage() {
    return <>
        <PageTitle title="Privacy Policy" />
        <Nav />
        <main className={styles.container}>
            <h1>
                Privacy Policy
            </h1>

            <p>
                <i>Last updated: Jan 13 2022.</i>
            </p>

            <p>
                For the purposes of this document, "We", "our", and "decomp.me" refers to this
                website, its API, and its administrators.
                "You" and "user" refers to any person or robot visiting this website.
            </p>

            <h2>Your privacy</h2>
            <p>
                We care and respect your right to privacy, and only store data we believe we have
                legitimate uses for. We have made every effort to ensure that we are compliant with
                privacy regulations such as GDPR, CCPA, and PECR.
            </p>

            <h2>Types of data we collect</h2>
            <p>
                <b>Logging:</b> decomp.me stores logs when users make requests to
                decomp.me and its associated API. Data logs are restricted to IP address,
                request path, and time/date. All logs older than 7 days are automatically
                deleted in the interests of data minimization.
                We will only use logs data in exceptional circumstances which we believe to
                be reasonable, such as to defend against attacks against our servers.
                Logging IP addresses for the legitimate purpose of security is a widespread practice
                and does not conflict with privacy regulations.
            </p>
            <p>
                <b>Analytics:</b> we use the open source Plausible Analytics software routed through our stats
                subdomain to count website visits etc.
                All analytics data collected is publicly available on <Link href="https://stats.decomp.me/decomp.me">stats.decomp.me</Link>.
                All site measurement is carried out absolutely anonymously and in aggregate only.
                Analytics data collected is limited to:
            </p>
            <ul>
                <li>Page URL</li>
                <li>HTTP Referer</li>
                <li>Browser and operating system (using User-Agent HTTP header, which is discarded)</li>
                <li>Device type (using screen width, which is discarded)</li>
                <li>Country, region, city (using IP address, which is then discarded)</li>
                <li>Actions taken on the site, such as compiling or saving a scratch</li>
            </ul>
            <p>
                For more information about analytics data, see the <Link href="https://plausible.io/data-policy">Plausible Data Policy</Link>.
            </p>
            <p>
                <b>Voluntarily-submitted information:</b> decomp.me collects and retains information
                voluntarily submitted to us. For logged-in users, this includes basic GitHub profile
                information such as name, email, and avatar. For all users, data submitted on the
                new scratch page and saved in the scratch editor will be stored and linked to your
                session.
            </p>
            <p>
                <b>Cookies:</b> decomp.me uses a single persistent authentication cookie used to link
                voluntarily-submitted information to your session on our site. If you are logged in,
                this cookie will link your session to your account on decomp.me. We do not show any
                'cookie banners' or 'privacy popups' on decomp.me because we do not use any third-party
                or analytics cookies.
            </p>

            <h2>How data is stored and used</h2>
            <p>
                decomp.me does not sell, rent, or mine user information under any circumstances.
                decomp.me's servers are located in Finland. which means that we will
                transfer, process, and store your information there. In very extreme cases, such as if
                required by police or other government agencies, data may be disclosed.
            </p>
            <p>
                Analytics data is used to prioritise what site features and fixes should be worked
                on and to let us determine features which are popular or unpopular.
            </p>
            <p>
                Voluntarily-submitted information is used to provide vital site features such
                as user profile pages and the scratch editor. We also reserve the right to use
                any and all volunarily-submited information for improving existing decompilation
                tools and developing new ones.
            </p>
            <p>
                We make every effort to keep your data secure. In the case of a breach, we will
                notify you and take appropriate action, such as revoking GitHub OAuth tokens.
                Please note that our servers never recieve or store user passwords.
            </p>

            <h2>How to request your data or delete it</h2>
            <p>
                If you want us to delete some or all data linked to you, please contact us via <Link href="https://discord.gg/sutqNShRRs">our Discord server</Link> or <Link href="https://github.com/decompme/decomp.me/issues">GitHub Issues</Link>.
                You may also want to disassociate your GitHub account with decomp.me through GitHub's website.
            </p>
            <p>
                You may contact us through the same channels linked above if you would like to request
                a copy of all data linked to you. Similarly, please contact us if you have any questions
                or concerns regarding this document.
            </p>
        </main>
        <Footer />
    </>
}
