import ReactModal from "react-modal"

import styles from "./Modal.module.scss"

export default function Modal(props: ReactModal.Props) {

    return <ReactModal
        className={styles.dialog}
        overlayClassName={styles.overlay}
        {...props}
    >
        {props.children}
    </ReactModal>
}
