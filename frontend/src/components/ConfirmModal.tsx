import Button from "./Button"
import styles from "./ConfirmModal.module.scss"
import Modal from "./Modal"

export type Props = {
    open: boolean
    onClose: () => void
    onConfirm: () => void
    title: string
    description?: string
}

export default function ConfirmModal({ open, onClose, onConfirm, title, description }: Props) {
    return <Modal
        isOpen={open}
        contentLabel={title}
    >
        <div className={styles.container}>
            <section className={styles.main}>
                <h2>{title}</h2>
                <p>{description}</p>
            </section>

            <div className={styles.actions}>
                <Button primary onClick={onConfirm}>OK</Button>
                <Button onClick={onClose}>Cancel</Button>
            </div>
        </div>
    </Modal>
}
