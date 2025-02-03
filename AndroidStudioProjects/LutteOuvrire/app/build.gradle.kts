plugins {
    alias(libs.plugins.android.application)
}

android {
    namespace = "fr.ul.lutteouvrire"
    compileSdk = 35

    defaultConfig {
        applicationId = "fr.ul.lutteouvrire"
        minSdk = 30
        targetSdk = 35
        versionCode = 1
        versionName = "1.0"

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_11
        targetCompatibility = JavaVersion.VERSION_11
    }
}

dependencies {

    implementation(libs.appcompat)
    implementation(libs.material)
    implementation(libs.activity)
    implementation(libs.constraintlayout)
    testImplementation(libs.junit)
    androidTestImplementation(libs.ext.junit)
    androidTestImplementation(libs.espresso.core)
    implementation(libs.jsoup)
    implementation(libs.recyclerview)
    implementation (libs.swiperefreshlayout)
    implementation(libs.kotlinx.coroutines.android)
    implementation (libs.viewpager2)
    implementation (libs.material.v1110)
    implementation (libs.glide)
    annotationProcessor (libs.compiler)

}