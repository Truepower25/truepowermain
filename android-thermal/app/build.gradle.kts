plugins {
    id("com.android.application")
    kotlin("android")
}

android {
    namespace = "co.truepower.thermal"
    compileSdk = 35
    buildToolsVersion = "36.0.0"

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }

    defaultConfig {
        applicationId = "co.truepower.thermal"
        minSdk = 26
        targetSdk = 35
        versionCode = 28
        versionName = "2.4.4"
        buildConfigField("String", "WEB_APP_URL", "\"https://www.truepower.co.ke/admin\"")
    }

    buildFeatures {
        buildConfig = true
    }
}

dependencies {
    implementation("androidx.core:core-ktx:1.15.0")
    implementation("androidx.appcompat:appcompat:1.7.0")
    implementation("androidx.activity:activity-ktx:1.10.0")
    implementation("androidx.webkit:webkit:1.12.1")
}
