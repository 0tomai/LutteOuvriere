package fr.ul.lutteouvrire;

import android.util.Log;

import androidx.annotation.NonNull;
import androidx.fragment.app.Fragment;
import androidx.fragment.app.FragmentActivity;
import androidx.viewpager2.adapter.FragmentStateAdapter;

public class SectionsPagerAdapter extends FragmentStateAdapter {

    public SectionsPagerAdapter(@NonNull FragmentActivity fragmentActivity) {
        super(fragmentActivity);
    }

    @NonNull
    @Override
    public Fragment createFragment(int position) {
        switch (position) {
            case 1:
                Log.i("SectionPager", "DansLeMonde");
                return new DansLeMondeFragment();
            case 2:
                return new LeurSocieteFragment();
            case 3:
                return new DansLesEntreprisesFragment();
            case 4:
                Log.i("SectionPager", "Mensuel - avant la création");
                return new MensuelFragment();
            case 5:
                Log.i("SectionPager", "CLT - création du fragment");
                return new CLTFragment();
            default:
                return new ALaUneFragment();
        }
    }

    @Override
    public int getItemCount() {
        return 6; // Augmenté de 5 à 6 pour inclure CLT
    }
}