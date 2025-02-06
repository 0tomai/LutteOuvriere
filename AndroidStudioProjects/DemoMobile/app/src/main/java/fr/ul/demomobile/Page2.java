package fr.ul.demomobile;

import android.Manifest;
import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Bundle;
import android.util.Log;
import android.widget.Button;
import android.widget.TextView;
import android.widget.Toast;

import androidx.activity.EdgeToEdge;
import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import com.google.android.gms.location.FusedLocationProviderClient;
import com.google.android.gms.location.LocationServices;

import org.json.JSONObject;

import java.io.IOException;
import java.util.Calendar;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.Response;

public class Page2 extends AppCompatActivity {
    private static final int LOCATION_PERMISSION_REQUEST_CODE = 1;
    private final ExecutorService executorService = Executors.newSingleThreadExecutor();
    private final OkHttpClient httpClient = new OkHttpClient();

    private FusedLocationProviderClient fusedLocationClient;
    private TextView locationText;
    private TextView weatherText;

    @SuppressLint("SetTextI18n")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        EdgeToEdge.enable(this);
        setContentView(R.layout.page2);

        locationText = findViewById(R.id.locali);
        weatherText = findViewById(R.id.weatherText);

        Intent intent = getIntent();
        String info = intent.getStringExtra("info");
        int val = intent.getIntExtra("val", 0);
        String currentLanguage = intent.getStringExtra("currentLanguage");

        TextView textViewInfo = findViewById(R.id.textViewInfo);
        assert currentLanguage != null;
        if(currentLanguage.equals("fr")) {
            textViewInfo.setText("Info : " + info + "\nValeur : " + val);
        }else{
            textViewInfo.setText("Info : " + info + "\nValue : " + val);
        }

        fusedLocationClient = LocationServices.getFusedLocationProviderClient(this);
        Button locationButton = findViewById(R.id.localisation);
        locationButton.setOnClickListener(v -> demandePermissionLoca());

        Button buttonRetour = findViewById(R.id.retour);
        buttonRetour.setOnClickListener(v -> retourBouton());

        if(currentLanguage.equals("fr")){
            locationButton.setText(getString(R.string.location_button));
            buttonRetour.setText(getString(R.string.back_button));
        } else {
            locationButton.setText(getString(R.string.location_button));
            buttonRetour.setText(getString(R.string.back_button));
        }
    }


    private void retourBouton() {
        Intent resultIntent = new Intent();
        String currentDate = Calendar.getInstance().getTime().toString();
        resultIntent.putExtra("dateRetour", currentDate);
        setResult(Activity.RESULT_FIRST_USER, resultIntent);
        finish();
    }

    private void demandePermissionLoca() {
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(this, new String[]{Manifest.permission.ACCESS_FINE_LOCATION}, LOCATION_PERMISSION_REQUEST_CODE);
        } else {
            getLocation();
        }
    }

    @SuppressLint("MissingPermission")
    private void getLocation() {
        fusedLocationClient.getLastLocation()
                .addOnSuccessListener(this, location -> {
                    if (location != null) {
                        String position = String.format(getString(R.string.location_format),
                                location.getLatitude(), location.getLongitude());
                        locationText.setText(position);
                        fetchWeatherData(location.getLatitude(), location.getLongitude());
                    } else {
                        locationText.setText(getString(R.string.location_unavailable));
                    }
                })
                .addOnFailureListener(e ->
                        Toast.makeText(this, getString(R.string.location_error, e.getMessage()),
                                Toast.LENGTH_SHORT).show());
    }


    private void fetchWeatherData(double latitude, double longitude) {
        String url = String.format("https://api.open-meteo.com/v1/forecast?latitude=%s&longitude=%s&current=temperature_2m,wind_speed_10m,wind_direction_10m,precipitation_probability,cloud_cover", latitude, longitude);

        new Thread(() -> {
            try {
                Request request = new Request.Builder().url(url).build();
                try (Response response = httpClient.newCall(request).execute()) {
                    if (response.body() != null) {
                        String responseData = response.body().string();
                        runOnUiThread(() -> processWeatherData(responseData));
                    }
                }
            } catch (IOException e) {
                showError("Erreur réseau: " + e.getMessage());
            }
        }).start();
    }

    private void processWeatherData(String jsonData) {
        try {
            JSONObject currentWeather = new JSONObject(jsonData).getJSONObject("current");
            Log.e("WeatherData", jsonData);

            double temperature = currentWeather.getDouble("temperature_2m");
            double precipitationProbability = currentWeather.getDouble("precipitation_probability");
            double cloudCover = currentWeather.getDouble("cloud_cover");
            double windSpeed = currentWeather.getDouble("wind_speed_10m");
            double windDirection = currentWeather.getDouble("wind_direction_10m");

            String weatherInfo = getString(R.string.weather_info, temperature, precipitationProbability, cloudCover, windSpeed, windDirection);

            weatherText.setText(weatherInfo);
        } catch (Exception e) {
            showError("Erreur données: " + e.getMessage());
        }
    }



    private void showError(String message) {
        runOnUiThread(() -> Toast.makeText(this, message, Toast.LENGTH_SHORT).show());
    }


    @Override
    public void onRequestPermissionsResult(int requestCode, @NonNull String[] permissions,
                                           @NonNull int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == LOCATION_PERMISSION_REQUEST_CODE) {
            if (grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                getLocation();
            } else {
                Toast.makeText(this, R.string.location_error,
                        Toast.LENGTH_SHORT).show();
            }
        }
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        executorService.shutdown();
    }
}