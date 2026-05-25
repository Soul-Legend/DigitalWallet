if(NOT TARGET hermes-engine::libhermes)
add_library(hermes-engine::libhermes SHARED IMPORTED)
set_target_properties(hermes-engine::libhermes PROPERTIES
    IMPORTED_LOCATION "C:/Users/Pedro/.gradle/caches/8.10.2/transforms/3c7124c3d06e1896d2b5733b9e5ca8ba/transformed/jetified-hermes-android-0.76.5-debug/prefab/modules/libhermes/libs/android.x86_64/libhermes.so"
    INTERFACE_INCLUDE_DIRECTORIES "C:/Users/Pedro/.gradle/caches/8.10.2/transforms/3c7124c3d06e1896d2b5733b9e5ca8ba/transformed/jetified-hermes-android-0.76.5-debug/prefab/modules/libhermes/include"
    INTERFACE_LINK_LIBRARIES ""
)
endif()

