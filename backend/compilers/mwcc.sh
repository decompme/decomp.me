#!/bin/bash
set -euo pipefail

# patch (file, offset, value)
patch () {
    echo "Patching $1 offset $2 with value $3"
    printf $(printf '\\x%02X' ${3}) | dd of="${1}" bs=1 seek=${2} count=1 conv=notrunc &> /dev/null
}

compiler_dir="$(dirname $(readlink -f "${BASH_SOURCE[0]}"))"
compiler_url="https://cdn.discordapp.com/attachments/727918646525165659/917185027656286218/GC_WII_COMPILERS.zip"
mwcceppc_exe="mwcceppc.exe"

echo "compiler_dir is ${compiler_dir}"

declare -A GC_COMPILERS
GC_COMPILERS["1.0"]="mwcc_233_144"
GC_COMPILERS["1.1"]="mwcc_233_159"
GC_COMPILERS["1.2.5"]="mwcc_233_163"
GC_COMPILERS["1.2.5e"]="mwcc_233_163e"
GC_COMPILERS["1.3.2"]="mwcc_242_81"
GC_COMPILERS["2.0"]="mwcc_247_92"
GC_COMPILERS["2.5"]="mwcc_247_105"
GC_COMPILERS["2.6"]="mwcc_247_107"
GC_COMPILERS["2.7"]="mwcc_247_108"
GC_COMPILERS["3.0"]="mwcc_41_60831"
GC_COMPILERS["3.0a3"]="mwcc_41_60126"

declare -A WII_COMPILERS
WII_COMPILERS["1.0"]="mwcc_42_142"
WII_COMPILERS["1.1"]="mwcc_43_151"
WII_COMPILERS["1.3"]="mwcc_43_172"
WII_COMPILERS["1.7"]="mwcc_43_213"

echo "Downloading MWCC compilers"
wget -q -O "${compiler_dir}/compilers.zip" "${compiler_url}"

echo "Extracting compilers"
unzip -oq "${compiler_dir}/compilers.zip" -d "${compiler_dir}" && rm "${compiler_dir}/compilers.zip"

for key in "${!GC_COMPILERS[@]}"; do
    compiler_id="${GC_COMPILERS[${key}]}"
    compiler_version="${key}"
    if [ -f "${compiler_dir}/GC/${compiler_version}/${mwcceppc_exe}" ]; then
        echo "Moving ${compiler_dir}/GC/${compiler_version}/* to ${compiler_id}/"
        mkdir -p "${compiler_dir}/${compiler_id}"
        mv "${compiler_dir}/GC/${compiler_version}/"* "${compiler_dir}/${compiler_id}/"
    fi
done

for key in "${!WII_COMPILERS[@]}"; do
    compiler_id="${WII_COMPILERS[${key}]}"
    compiler_version="${key}"
    if [ -f "${compiler_dir}/Wii/${compiler_version}/${mwcceppc_exe}" ]; then
        echo "Moving ${compiler_dir}/Wii/${compiler_version}/* to ${compiler_id}/"
        mkdir -p "${compiler_dir}/${compiler_id}"
        mv "${compiler_dir}/Wii/${compiler_version}/"* "${compiler_dir}/${compiler_id}/"
    fi
done

# patch compilers

if [ -f "${compiler_dir}/mwcc_247_108/${mwcceppc_exe}" ]; then
    mkdir -p "${compiler_dir}/mwcc_247_108_tp"
    cp -r "${compiler_dir}/mwcc_247_108/"* "${compiler_dir}/mwcc_247_108_tp/"
    patch "${compiler_dir}/mwcc_247_108_tp/${mwcceppc_exe}" 1862228 109
fi
