import { Fragment, useState } from "react"

import { useLibraries } from "@/lib/api"
import { Library, TerseScratch } from "@/lib/api/types"
import { TrashIcon } from "@primer/octicons-react"

import Button from "@/components/Button"
import Select from "@/components/Select2"

import styles from "./LibraryPanel.module.css"

type LibrariesT = {
    libraries: Library[]
}

type Props = {
    scratch: TerseScratch
    onChange: (value: LibrariesT) => void
}

export default function LibraryPanel({ scratch, onChange }: Props) {
    const libraries = useLibraries()

    const hasLibrary = libName => scratch.libraries.some(lib => lib.name == libName)
    const libraryVersions = scratchlib => {
        const lib = libraries.find(lib => lib.name == scratchlib.name)
        if (lib != null) {
            return lib.supported_versions
        } else {
            return [scratchlib.version]
        }
    }

    const addLibrary = libName => {
        const lib = libraries.find(lib => lib.name == libName)
        if (lib != null) {
            return setLibraryVersion(libName, lib.supported_versions[0])
        }
    }
    const setLibraryVersion = (libName, ver) => {
        // clone the libraries
        const libs = JSON.parse(JSON.stringify(scratch.libraries))
        // Check if the library is already enabled, if so return it
        const scratchlib = scratch.libraries.find(scratchlib => scratchlib.name == libName)
        if (scratchlib != null) {
            // If it is, set the version
            scratchlib.version = ver
        } else {
            // If it isn't, add the library to the list
            libs.push({ name: libName, version: ver })
        }
        onChange({
            libraries: libs,
        })
    }
    const removeLibrary = libName => {
        // clone the libraries
        let libs = JSON.parse(JSON.stringify(scratch.libraries))
        // Only keep the libs whose name are not libName
        libs = libs.filter(lib => lib.name != libName)
        onChange({
            libraries: libs,
        })
    }

    let librariesSelectOptions = libraries
        // Filter out libraries that are already in the scratch
        .filter(lib => !scratch.libraries.some(scratchlib => scratchlib.name == lib.name))
        // Turn them into something the Select component accepts.
        .map(lib => lib.supported_versions.map(ver => [lib.name, lib.name]))
        .flat()

    // Prepend a null value to the selector.
    const selectOptions = Object.fromEntries([["__NULL__", "---"], ...librariesSelectOptions])

    const scratchLibraryElements = scratch.libraries.map(lib => <Fragment key={lib.name}>
        <label className={styles.libraryName}>{lib.name}</label>
        <Select
            value={lib.version}
            onChange={value => setLibraryVersion(lib.name, value)}
            options={libraryVersions(lib)} />
        <button className={styles.deleteButton} onClick={() => removeLibrary(lib.name)}><TrashIcon />Remove library</button>
    </Fragment>)

    const [selectedLib, setSelectedLib] = useState('__NULL__')

    return <div>
        <section className={styles.section}>
            <h3>Libraries</h3>
            <div className={styles.addLibraryRow}>
                <Select
                    value={selectedLib}
                    onChange={setSelectedLib}
                    options={selectOptions}
                    className={styles.librarySelect} />
                <Button primary onClick={() => addLibrary(selectedLib)}>Add library</Button>
            </div>
            <div className={styles.librariesGrid}>
                {scratchLibraryElements}
            </div>
        </section>
    </div>
}
