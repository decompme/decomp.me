import { useLibraries } from "@/lib/api"
import { Library, TerseScratch } from "@/lib/api/types"

import Select from "../Select2"

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
    const libraryVersion = lib => {
        const scratchlib = scratch.libraries.find(scratchlib => scratchlib.name == lib.name)
        if (scratchlib != null) {
            return scratchlib.version
        } else {
            return "___NULL_VERSION___"
        }
    }

    const setLibraryVersion = (libName, ver) => {
        if (ver == "___NULL_VERSION___") {
            return unsetLibrary(libName)
        }

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
    const unsetLibrary = libName => {
        // clone the libraries
        let libs = JSON.parse(JSON.stringify(scratch.libraries))
        // Only keep the libs whose name are not libName
        libs = libs.filter(lib => lib.name != libName)
        onChange({
            libraries: libs,
        })
    }
    const toggleLibrary = lib => {
        if (hasLibrary(lib.name)) {
            unsetLibrary(lib.name)
        } else {
            setLibraryVersion(lib.name, lib.supported_versions[0])
        }
    }

    const selectOptions = lib => Object.fromEntries([["___NULL_VERSION___", "Disabled"], ...lib.supported_versions.map(ver => [ver, ver])])

    const librariesElements = libraries.map(lib => <div key={lib.name} className={styles.library}>
        <input type="checkbox" checked={hasLibrary(lib.name)} onChange={() => toggleLibrary(lib)} />
        <label className={styles.libraryName}>{lib.name}</label>
        <Select
            value={libraryVersion(lib)}
            onChange={value => setLibraryVersion(lib.name, value)}
            options={selectOptions(lib)}
            className={styles.librarySelect} />
    </div>)

    return <div>
        <section className={styles.section}>
            <h3>Libraries</h3>
            {librariesElements}
        </section>
    </div>
}
