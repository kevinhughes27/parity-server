package io.masse.parityleaguestats;

import android.content.Context;
import android.os.Environment;

import java.io.File;

public class Persistence {
    private Context context;
    private static final String strAppDirectory = "ParityLeagueStats";
    private static final String strRosterFile = "roster.JSON";

    public Persistence(Context context) {
        this.context = context;
    }

    public File rosterJSON() {
        return new File(fileStorageDirectory() + "/" + strAppDirectory , strRosterFile);
    }

    private File fileStorageDirectory() {
        File folder;

        String state = Environment.getExternalStorageState();
        if (Environment.MEDIA_MOUNTED.equals(state)) {
            folder = Environment.getExternalStorageDirectory();
        } else {
            folder = context.getFilesDir();
        }

        return folder;
    }
}
