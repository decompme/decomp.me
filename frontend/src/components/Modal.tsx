import ReactModal from "react-modal"

import styles from "./Modal.module.scss"

export type Props = {
}

export default function Modal(props: ReactModal.Props & Props) {

    return <ReactModal
        className={styles.dialog}
        overlayClassName={styles.overlay}
        {...props}
    >
        {props.children}
    </ReactModal>
}
