package fr.ul.demomobile;

import static android.icu.lang.UCharacter.GraphemeClusterBreak.L;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.Intent;
import android.content.res.Configuration;
import android.graphics.Bitmap;
import android.os.Bundle;
import android.provider.MediaStore;
import android.renderscript.ScriptGroup;
import android.util.Log;
import android.view.Menu;
import android.view.MenuItem;
import android.view.View;
import android.widget.Button;
import android.widget.ImageView;
import android.widget.Toast;
import android.widget.Toolbar;

import androidx.activity.EdgeToEdge;
import androidx.activity.result.ActivityResult;
import androidx.activity.result.ActivityResultCallback;
import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;

import com.google.android.material.snackbar.Snackbar;

import java.util.Locale;

public class MainActivity extends AppCompatActivity implements View.OnClickListener{
    ActivityResultLauncher<Intent> page2Launcher;
    ImageView photoView;

    ActivityResultLauncher<Intent> photoLauncher;
    String currentLanguage;

    @SuppressLint("MissingInflatedId")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);
        currentLanguage = Locale.getDefault().getLanguage();
        if (currentLanguage.equals("fr")) {
            setLanguage("fr");
        } else {
            setLanguage("en");
        }
        setContentView(R.layout.activity_main);
        ViewCompat.setOnApplyWindowInsetsListener(findViewById(R.id.main), (v, insets) -> {
            Insets systemBars = insets.getInsets(WindowInsetsCompat.Type.systemBars());
            v.setPadding(systemBars.left, systemBars.top, systemBars.right, systemBars.bottom);
            return insets;
        });

        Button buttonPage = findViewById(R.id.page);
        buttonPage.setOnClickListener(this);

        Button buttonPhoto = findViewById(R.id.photo);
        buttonPhoto.setOnClickListener(this);

        photoView = findViewById(R.id.imageView);

        photoLauncher = registerForActivityResult(
                new ActivityResultContracts.StartActivityForResult(),
                new ActivityResultCallback<ActivityResult>() {
                    @Override
                    public void onActivityResult(ActivityResult o) {
                        if(o.getResultCode() == Activity.RESULT_OK){
                            Intent data = o.getData();
                            if(data != null && data.getExtras() != null){
                                Bitmap photo = (Bitmap) data.getExtras().get("data");
                                if(photo != null){
                                    photoView.setImageBitmap(photo);
                                    String message = "Photo prise : " + photo.getWidth() + "x" + photo.getHeight();
                                    Toast.makeText(MainActivity.this, message, Toast.LENGTH_SHORT).show();
                                    Log.i("PHOTO", message);
                                }
                            }
                        } else {
                            Toast.makeText(MainActivity.this, "Retour de photo invalide", Toast.LENGTH_SHORT).show();
                        }
                    }
                }

        );



        page2Launcher = registerForActivityResult(
                new ActivityResultContracts.StartActivityForResult(),
                result -> {
                    if (result.getResultCode() == Activity.RESULT_FIRST_USER) {
                        String dateRetour = result.getData().getStringExtra("dateRetour");
                        Toast.makeText(MainActivity.this, "Date retour : " + dateRetour, Toast.LENGTH_LONG).show();
                    }
                }
        );

    }

    public void onBonjour(View view){
        String message;
        if(currentLanguage.equals("fr")) {
           message = "Bonjour !";
        }else{
            message = "Hello !";
        }
        Toast.makeText(this, message, Toast.LENGTH_SHORT).show();
        Log.i("BONJOUR", message);
    }

    @Override
    public void onClick(View v) {
        if(v.getId() == R.id.page){
            Intent intent = new Intent(MainActivity.this, Page2.class);
            if(currentLanguage.equals("fr")) {
                intent.putExtra("info", "Bonjour depuis mainActivity");
            }else{
                intent.putExtra("info", "Hello from mainActivity");
            }
            intent.putExtra("val", 42);
            intent.putExtra("currentLanguage", currentLanguage);
            page2Launcher.launch(intent);
            //String message = "page";
            //Snackbar.make(v, message, Snackbar.LENGTH_LONG).setAction("OK", new View.OnClickListener(){
//                @Override
//                public void onClick(View v){
//                    Log.i("SNACKBAR", message);
//                }
//            }).show();
        } else if (v.getId() == R.id.photo){
            Intent intent = new Intent(MediaStore.ACTION_IMAGE_CAPTURE);
            if(intent.resolveActivity(getPackageManager()) != null) {
                photoLauncher.launch(intent);
            }else {
                Toast.makeText(this, "Aucune application de caméra disponible", Toast.LENGTH_SHORT).show();
            }
        }
    }
    private void setLanguage(String language) {
        if (currentLanguage != null && currentLanguage.equals(language)) {
            return;
        }

        Locale locale = new Locale(language);
        Locale.setDefault(locale);

        Configuration config = new Configuration();
        config.locale = locale;

        getResources().updateConfiguration(config, getResources().getDisplayMetrics());
        currentLanguage = language;
    }


    @Override
    public boolean onCreateOptionsMenu(Menu menu) {
        getMenuInflater().inflate(R.menu.menu_main, menu);
        return true;
    }

    @Override
    public boolean onOptionsItemSelected(MenuItem item) {
        Button buttonPhoto = findViewById(R.id.photo);
        Button buttonPage = findViewById(R.id.page);
        Button buttonBonjour = findViewById(R.id.bonjour);
        if (item.getItemId() == R.id.action_change_language) {
            if (currentLanguage.equals("fr")) {
                setLanguage("en");
                Log.i("LANGUE", currentLanguage);
                item.setTitle(R.string.menu_language); // Change le titre
                buttonPage.setText(R.string.page);
                buttonPhoto.setText(R.string.picture);
                buttonBonjour.setText(R.string.hello);
            } else {
                setLanguage("fr");
                Log.i("LANGUE", currentLanguage);
                item.setTitle(R.string.menu_language);
                buttonPage.setText(R.string.page);
                buttonPhoto.setText(R.string.picture);
                buttonBonjour.setText(R.string.hello);
            }
            return true;
        }
        return super.onOptionsItemSelected(item);
    }

}