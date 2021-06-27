interface ContainerProps {
    small?: boolean
    centered?: boolean
}

export const Container: React.FC<ContainerProps> = ({small = false, centered=false, children}) => {
        return (
            <div style={{
                margin: centered ? 'auto' : '0 auto',
                width: small ? '500px' : '1024px'
            }}>
                {children}
            </div>
        );
}