declare module "*.module.css" {
    const styles: { [className: string]: string }
    export default styles
}

interface ImportMeta {
    env: {
        DEBUG: boolean,
        API_BASE: string,
        GITHUB_CLIENT_ID?: string,
    },
}
