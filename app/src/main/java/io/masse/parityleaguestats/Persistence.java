package io.masse.parityleaguestats;

import android.content.Context;
import android.os.Environment;
import android.widget.Toast;

import java.io.File;

public class Persistence {
    private Context context;
    private static final String strAppDirectory = "ParityLeagueStats";
    private static final String strAutoSaveDirectory = "autosave";
    private static final String strFinalSaveDirectory = "finalsave";
    private static final String strRosterFile = "roster.JSON";

    public Persistence(Context context) {
        this.context = context;
    }

    public void initializeDirectories() {
        createDirectory(new File(fileStorageDirectory() + "/" + strAppDirectory));
        createDirectory(new File(fileStorageDirectory() + "/" + strAppDirectory + "/" + strAutoSaveDirectory));
        createDirectory(new File(fileStorageDirectory() + "/" + strAppDirectory + "/" + strFinalSaveDirectory));
    }

    public File rosterJSON() {
        return new File(fileStorageDirectory() + "/" + strAppDirectory , strRosterFile);
    }

    public File autosaveFile() {
        return new File(fileStorageDirectory() + "/" + strAppDirectory + "/" + strAutoSaveDirectory);
    }

    public File finalsaveFile() {
        return new File(fileStorageDirectory() + "/" + strAppDirectory + "/" + strFinalSaveDirectory);
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

    private void createDirectory(File folder) {
        if (!folder.exists()) {
            Toast.makeText(context, "Directory Found: " + folder, Toast.LENGTH_SHORT).show();
        } else {
            Toast.makeText(context, "Missing Directory" + folder, Toast.LENGTH_SHORT).show();
            if (folder.mkdir()) {
                Toast.makeText(context, "Directory Created.", Toast.LENGTH_SHORT).show();
            } else {
                Toast.makeText(context, "Error", Toast.LENGTH_SHORT).show();
            }
        }
    }
}
