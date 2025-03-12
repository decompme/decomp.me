import Link from "next/link";

const subtitle = "mt-8 text-xl font-semibold tracking-tight text-gray-11";
const link = "text-blue-11 hover:underline active:translate-y-px";

export const metadata = {
    title: "Privacy policy",
};

export default function Page() {
    return (
        <main className="mx-auto max-w-prose p-4 pb-2 text-justify text-base leading-normal">
            <h1 className="font-semibold text-2xl text-gray-12 tracking-tight md:text-3xl">
                Privacy policy
            </h1>

            <p className="mt-2 mb-6 text-gray-11 text-sm">
                Last updated March 11th 2025
            </p>

            <p className="mt-2 mb-6 text-gray-11 text-sm">
                Changelog:
                <ul className="mt-2 mb-6 px-4 text-gray-11 text-sm">
                    <li className="my-1">2022/1/13: Initial version</li>
                </ul>
                <ul className="mt-2 mb-6 px-4 text-gray-11 text-sm">
                    <li className="my-1">
                        2025/3/11: Update to clarify public data usage
                    </li>
                </ul>
            </p>

            <p className="my-4">
                For the purposes of this document, "We", "our", and "decomp.me"
                refers to this website, its API, and its administrators. "You"
                and "user" refers to any person or robot visiting this website.
            </p>

            <h2 className={subtitle}>Your privacy</h2>
            <p className="my-4">
                We care and respect your right to privacy, and only store data
                we believe we have legitimate uses for. We have made every
                effort to ensure that we are compliant with privacy regulations
                such as GDPR, CCPA, and PECR.
            </p>

            <h2 className={subtitle}>Types of data we collect</h2>
            <p className="my-4">
                <b>Logging:</b> decomp.me stores logs when users make requests
                to decomp.me and its associated API. Data logs are restricted to
                IP address, request path, and time/date. All logs older than 7
                days are automatically deleted in the interests of data
                minimization. We will only use logs data in exceptional
                circumstances which we believe to be reasonable, such as to
                defend against attacks against our servers. Logging IP addresses
                for the legitimate purpose of security is a widespread practice
                and does not conflict with privacy regulations.
            </p>
            <p className="my-4">
                <b>Analytics:</b> we use the open source Plausible Analytics
                software routed through our stats subdomain to count website
                visits etc. All analytics data collected is publicly available
                on{" "}
                <Link href="https://stats.decomp.me/decomp.me" className={link}>
                    stats.decomp.me
                </Link>
                . All site measurement is carried out absolutely anonymously and
                in aggregate only. Analytics data collected is limited to:
            </p>
            <ul className="mt-2 mb-6 px-4 text-gray-11 text-sm">
                <li className="my-1">Page URL</li>
                <li className="my-1">HTTP Referer</li>
                <li className="my-1">
                    Browser and operating system (using User-Agent HTTP header,
                    which is discarded)
                </li>
                <li className="my-1">
                    Device type (using screen width, which is discarded)
                </li>
                <li className="my-1">
                    Country, region, city (using IP address, which is then
                    discarded)
                </li>
                <li className="my-1">
                    Actions taken on the site, such as compiling or saving a
                    scratch
                </li>
            </ul>
            <p className="my-4">
                For more information about analytics data, see the{" "}
                <Link href="https://plausible.io/data-policy" className={link}>
                    Plausible Data Policy
                </Link>
                . Please note that decomp.me servers, not Plausible, store and
                process our analytics data.
            </p>
            <p className="my-4">
                <b>Voluntarily-submitted information:</b> decomp.me collects and
                retains information voluntarily submitted to us. For logged-in
                users, this includes basic GitHub profile information such as
                name, email, and avatar. For all users, data submitted on the
                new scratch page and saved in the scratch editor will be stored
                and linked to your session.
            </p>
            <p className="my-4">
                <b>Cookies:</b> decomp.me uses a single persistent
                authentication cookie used to link voluntarily-submitted
                information to your session on our site. If you are logged in,
                this cookie will link your session to your account on decomp.me.
                We do not show any 'cookie banners' or 'privacy popups' on
                decomp.me because we do not use any third-party or analytics
                cookies.
            </p>

            <h2 className={subtitle}>How data is stored and used</h2>
            <p className="my-4">
                decomp.me does not sell, rent, or mine user information under
                any circumstances. decomp.me's servers are located in Finland.
                which means that we will transfer, process, and store your
                information there. In very extreme cases, such as if required by
                police or other government agencies, data may be disclosed.
            </p>
            <p className="my-4">
                Analytics data is used to prioritise what site features and
                fixes should be worked on and to let us determine features which
                are popular or unpopular.
            </p>
            <p className="my-4">
                Voluntarily-submitted information is used to provide vital site
                features such as user profile pages and the scratch editor. We
                also reserve the right to use any and all voluntarily-submited
                information for improving existing decompilation tools and
                developing new ones. We may also provide periodic public exports
                of the site database for research in the field of decompilation.
                These dumps will not contain any information that is not
                otherwise publicly available on the site.
            </p>
            <p className="my-4">
                We make every effort to keep your data secure. In the case of a
                breach, we will notify you and take appropriate action, such as
                revoking GitHub OAuth tokens. Please note that our servers never
                receive or store user passwords.
            </p>

            <h2 className={subtitle}>How to request your data or delete it</h2>
            <p className="my-4">
                If you want us to delete some or all data linked to you, please
                contact us via{" "}
                <Link href="https://discord.gg/sutqNShRRs" className={link}>
                    our Discord server
                </Link>{" "}
                or{" "}
                <Link href="https://github.com/decompme/decomp.me/issues">
                    GitHub Issues
                </Link>
                . You may also want to{" "}
                <Link
                    href="https://github.com/settings/applications"
                    className={link}
                >
                    disassociate your GitHub account with decomp.me
                </Link>
                .
            </p>
            <p className="my-4">
                You may contact us through the same channels linked above if you
                would like to request a copy of all data linked to you.
                Similarly, please contact us if you have any questions or
                concerns regarding this document.
            </p>
        </main>
    );
}
