package io.masse.parityleaguestats;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.app.AlertDialog;
import android.content.Context;
import android.content.DialogInterface;
import android.content.Intent;
import android.graphics.Typeface;
import android.net.Uri;
import android.os.AsyncTask;
import android.os.Bundle;
import android.os.Environment;
import android.text.Editable;
import android.view.ContextMenu;
import android.view.Gravity;
import android.view.LayoutInflater;
import android.view.Menu;
import android.view.MenuInflater;
import android.view.MenuItem;
import android.view.View;
import android.view.ViewGroup;
import android.view.ViewGroup.LayoutParams;
import android.widget.BaseAdapter;
import android.widget.Button;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.ListView;
import android.widget.TextView;
import android.widget.Toast;

import org.json.JSONObject;
import org.json.JSONArray;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileOutputStream;
import java.io.FileReader;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.Locale;
import java.util.Iterator;

import io.masse.parityleaguestats.customLayout.customLinearLayout;


//TODO change swap direction to large arrow
//TODO remove static text
//TODO separate class to handle state.
//todo add unknown button to each side.
//todo add about

@SuppressWarnings({"unchecked", "null"})

public class Stats extends Activity {

    //States for each ViewState to be in.
    private int currentState;
    private int previousState;
    private static final int autoState = 0;
    private static final int normalState = 1;
    private static final int firstDState = 2;
    private static final int startState = 3;
    private static final int pullState = 4;
    private static final int whoPickedUpDiscState = 5;
    private static final int editState = 6;
    private static final int halfState = 7;
    private static final int firstThrowQuebecVariantState = 8;
    private static final int firstActionState = 9;
    private static final int rosterChangeState = 10;

    //Disc Directions
    private static final boolean left = true;
    private static final boolean right = false;

    //Edit Team and Rosters
    private boolean editOn = false;
    private boolean rosterChange = false;
    private boolean forceRosterChange = true;
    private boolean forceRosterInvert = false;
    private boolean requestHalf = false;
    private boolean requestUpdateScore = false;
    private boolean requestChangeRoster = false;
    private boolean visibleState[][];
    private ArrayList<String> arrayUndoNames = new ArrayList<String>();
    private boolean requestUpdateButtons = false;

    private customLinearLayout layoutLeft;
    private customLinearLayout layoutRight;
    private Context mainContext;

    private statsTickerAdapter adapter;
    private boolean discPossession;

    private static Button btnPull, btnPoint, btnDrop, btnD, btnCatchD,  btnThrowAway, btnUndo, btnMode;
    TextView leftTeamName, rightTeamName, leftScore, rightScore;
    private MenuItem mnuItmEditTeam;

    private Button btnLastButtonClicked;
    private File lastFileSaved;
    private actionTracker gameStats;
    private Bookkeeper bookkeeper;

    private View.OnClickListener mainOnClickListener;
    private View.OnClickListener changeTextListener;
    private View.OnClickListener changeModeListener;
    private View.OnClickListener toggleUserListener;

    private static final File fileStorageDirectory = Environment.getExternalStorageDirectory();
    private static final String strAppDirectory = "ParityLeagueStats";
    private static final String strAutoSaveDirectory = "autosave";
    private static final String strFinalSaveDirectory = "finalsave";
    private static final String strRosterFileName = "roster.JSON";

    private final Stats myself = this;

    private allTeams rosterList;

    private LinearLayout.LayoutParams param;

    //todo fix this it's ugly
    private int intChosenTeam;
    private ArrayList<String> leftPlayers;
    private ArrayList<String> rightPlayers;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        setContentView(R.layout.activity_stats);
        mainContext = this;

        rosterList = new allTeams();

        //Setup Buttons
        btnPull = (Button) findViewById(R.id.btnPull);
        btnPoint = (Button) findViewById(R.id.btnPoint);
        btnDrop = (Button) findViewById(R.id.btnDrop);
        btnD = (Button) findViewById(R.id.btnD);
        btnCatchD = (Button) findViewById(R.id.btnCatchD);
        btnThrowAway = (Button) findViewById(R.id.btnThrowAway);
        btnUndo = (Button) findViewById(R.id.btnUndo);
        btnMode = (Button) findViewById(R.id.btnMode);

        //Setup TextView
        leftTeamName = (TextView) findViewById(R.id.leftTeam);
        rightTeamName = (TextView) findViewById(R.id.rightTeam);
        leftScore = (TextView) findViewById(R.id.leftScore);
        rightScore = (TextView) findViewById(R.id.rightScore);

        intChosenTeam = -1;
        currentState = -1;
        previousState = currentState;

        discPossession = true;

        layoutLeft = (customLinearLayout) findViewById(R.id.layoutLeftNames);
        layoutRight = (customLinearLayout) findViewById(R.id.layoutRightNames);

        ListView listView = (ListView) findViewById(R.id.listPlayByPlay);
        gameStats = new actionTracker(myself);
        bookkeeper = new Bookkeeper();
        adapter = new statsTickerAdapter();
        listView.setAdapter(adapter);

        createDefaultDirectories();


        int margin = getResources().getDimensionPixelSize(R.dimen.button_all_margin);
        param = new LinearLayout.LayoutParams(
                LayoutParams.MATCH_PARENT,
                LayoutParams.MATCH_PARENT, 1.0f);
        param.setMargins(margin,margin,margin,margin);

        mainOnClickListener = new View.OnClickListener() {
            @Override
            public void onClick(View view) {
                btnLastButtonClicked = (Button) view;
                new ButtonPress().execute((Button) view);
            }
        };

        changeModeListener = new View.OnClickListener(){
            @Override
            public void onClick(View view) {

                if (rosterChange){
                    changeState(autoState);
                }else{
                    changeState(rosterChangeState);
                }
            }
        };

        toggleUserListener = new View.OnClickListener(){
            @Override
        public void onClick(View view){

                Button currentButton = (Button) view;
                if (currentButton.getTypeface()!=null){
                    currentButton.setTypeface(null, Typeface.NORMAL);
                }else {
                    currentButton.setTypeface(null, Typeface.BOLD);
                }
            }
        };

        changeTextListener = new View.OnClickListener() {
            @Override
            public void onClick(View view) {
                btnLastButtonClicked = (Button) view;
                final EditText input = new EditText(view.getContext());

                new AlertDialog.Builder(mainContext)
                        .setTitle("Edit")
                        .setItems(new String[] {"Add a Sub from an Existing Team" , "Add a Sub from the Subs List" , "Add a sub manually" , "Change Player Colour" , "Delete this player" , "Cancel"}, new DialogInterface.OnClickListener() {
                            public void onClick(DialogInterface dialog, int which) {
                                switch (which){
                                    case 0: //add sub from Existing team
                                        new AlertDialog.Builder(mainContext)
                                                .setTitle("Choose Team")
                                                .setItems(rosterList.getTeams(), new DialogInterface.OnClickListener() {
                                                    public void onClick(DialogInterface dialog, int which) {
                                                        intChosenTeam = which;
                                                        new AlertDialog.Builder(mainContext)
                                                                .setTitle("Choose Player")
                                                                .setItems(rosterList.getPlayers(which), new DialogInterface.OnClickListener() {
                                                                    public void onClick(DialogInterface dialog, int which) {
                                                                        forceRosterChange = true;
                                                                        Button btn = new Button(mainContext);
                                                                        TextView teamName;

                                                                        boolean isFemale = rosterList.checkIfFemale(intChosenTeam,which);
                                                                        if (btnLastButtonClicked.getParent() == layoutRight){
                                                                            teamName = rightTeamName;
                                                                            if (isFemale){
                                                                                btn.setBackgroundColor(getResources().getColor(R.color.rightGirlsColour));
                                                                            }
                                                                            else {
                                                                                btn.setBackgroundColor(getResources().getColor(R.color.rightGuysColour));
                                                                            }
                                                                        }else{
                                                                            teamName = leftTeamName;
                                                                            if (isFemale){
                                                                                btn.setBackgroundColor(getResources().getColor(R.color.leftGirlsColour));
                                                                            }
                                                                            else {
                                                                                btn.setBackgroundColor(getResources().getColor(R.color.leftGuysColour));
                                                                            }
                                                                        }

                                                                        if (rosterList.getTeamName(intChosenTeam).equals(teamName.getText().toString())){
                                                                            btn.setText(rosterList.getPlayerName(intChosenTeam, which));
                                                                        }else{
                                                                            String txtButtonText = rosterList.getPlayerName(intChosenTeam, which) + "(S)";
                                                                            btn.setText(txtButtonText);
                                                                        }
                                                                        //float margin = getResources().getDimension(R.dimen.button_all_margin);

                                                                        ((LinearLayout) btnLastButtonClicked.getParent()).addView(btn);
                                                                        btn.setLayoutParams(param);
                                                                        btn.setId(((LinearLayout) btnLastButtonClicked.getParent()).getChildCount() - 1);
                                                                        btn.setOnClickListener(changeTextListener);
                                                                        btn.setGravity(btnLastButtonClicked.getGravity());
                                                                    }
                                                                }).setNegativeButton("Cancel", new DialogInterface.OnClickListener() {
                                                            public void onClick(DialogInterface dialog, int whichButton) {
                                                                // Do nothing.
                                                            }
                                                        }).show();
                                                    }
                                                }).setNegativeButton("Cancel", new DialogInterface.OnClickListener() {
                                            public void onClick(DialogInterface dialog, int whichButton) {
                                                // Do nothing.
                                            }
                                        }).show();


                                        break;
                                    case 1:// add sub from subs list
                                        new AlertDialog.Builder(mainContext)
                                                .setTitle("Choose Player")
                                                .setItems(rosterList.getPlayers(rosterList.size() - 1), new DialogInterface.OnClickListener() {
                                                    public void onClick(DialogInterface dialog, int which) {
                                                        forceRosterChange = true;
                                                        intChosenTeam = rosterList.size()  -1 ;
                                                        Button btn = new Button(mainContext);

                                                        boolean isFemale = rosterList.checkIfFemale(intChosenTeam,which);
                                                        if (btnLastButtonClicked.getParent() == layoutRight){
                                                            if (isFemale){
                                                                btn.setBackgroundColor(getResources().getColor(R.color.rightGirlsColour));
                                                            }
                                                            else {
                                                                btn.setBackgroundColor(getResources().getColor(R.color.rightGuysColour));
                                                            }
                                                        }else{
                                                            if (isFemale){
                                                                btn.setBackgroundColor(getResources().getColor(R.color.leftGirlsColour));
                                                            }
                                                            else {
                                                                btn.setBackgroundColor(getResources().getColor(R.color.leftGuysColour));
                                                            }
                                                        }
                                                        String txtButtonText = rosterList.getPlayerName(rosterList.size() - 1, which) + "(S)";

                                                        btn.setText(txtButtonText);
                                                        ((LinearLayout) btnLastButtonClicked.getParent()).addView(btn);
                                                        btn.setLayoutParams(param);
                                                        btn.setId(((LinearLayout) btnLastButtonClicked.getParent()).getChildCount() - 1);
                                                        btn.setOnClickListener(changeTextListener);
                                                        btn.setGravity(btnLastButtonClicked.getGravity());
                                                    }
                                                }).setNegativeButton("Cancel", new DialogInterface.OnClickListener() {
                                            public void onClick(DialogInterface dialog, int whichButton) {
                                                // Do nothing.
                                            }
                                        }).show();
                                        break;
                                    case 2: //add a sub manually
                                        new AlertDialog.Builder(mainContext)
                                                .setTitle("Change " + btnLastButtonClicked.getText())
                                                .setMessage("Change Name" )
                                                .setView(input)
                                                .setPositiveButton("Ok", new DialogInterface.OnClickListener() {
                                                    public void onClick(DialogInterface dialog, int whichButton) {
                                                        forceRosterChange = true;
                                                        Editable value = input.getText();
                                                        Button btn = new Button(mainContext);
                                                        String txtButtonText = value.toString()+"(S)";
                                                        btn.setText(txtButtonText);
                                                        ((LinearLayout) btnLastButtonClicked.getParent()).addView(btn);
                                                        btn.setLayoutParams(param);
                                                        btn.setId(((LinearLayout) btnLastButtonClicked.getParent()).getChildCount() - 1);
                                                        btn.setOnClickListener(changeTextListener);
                                                        btn.setBackgroundColor(getResources().getColor(R.color.manualEntryButtonColour));
                                                        btn.setGravity(btnLastButtonClicked.getGravity());
                                                    }
                                                }).setNegativeButton("Cancel", new DialogInterface.OnClickListener() {
                                            public void onClick(DialogInterface dialog, int whichButton) {
                                                // Do nothing.
                                            }
                                        }).show();
                                        break;
                                    /*case 3: //change player color

                                        int initialValue = ((ColorDrawable) btnLastButtonClicked.getBackground()).getColor();
                                        //Log.d("mColorPicker", "initial value:" + initialValue);

                                        final ColorPickerDialog colorDialog = new ColorPickerDialog(mainContext, initialValue);

                                        colorDialog.setAlphaSliderVisible(false);
                                        colorDialog.setTitle("Pick " + btnLastButtonClicked.getText().toString() + "'s Colour");

                                        colorDialog.setButton(DialogInterface.BUTTON_POSITIVE, getString(android.R.string.ok), new DialogInterface.OnClickListener() {
                                            @Override
                                            public void onClick(DialogInterface dialog, int which) {

                                                btnLastButtonClicked.setBackgroundColor(colorDialog.getColor());

                                            }
                                        });
                                        colorDialog.setButton(DialogInterface.BUTTON_NEGATIVE, getString(android.R.string.cancel), new DialogInterface.OnClickListener() {

                                            @Override
                                            public void onClick(DialogInterface dialog, int which) {
                                                //Nothing to do here.
                                            }
                                        });
                                        colorDialog.show();

                                        break;
                                        */
                                    case 4://delete player
                                        forceRosterChange = true;
                                        ((LinearLayout) btnLastButtonClicked.getParent()).removeView(btnLastButtonClicked);
                                        break;
                                    case 5:
                                        //do nothing
                                        break;
                                }
                            }
                        }).show();
            }
        };

        if ((savedInstanceState != null) && (savedInstanceState.getSerializable("arrayEventNames") != null)  && (savedInstanceState.getSerializable("arrayEventActions") != null) && (savedInstanceState.getSerializable("leftTeam") != null) && (savedInstanceState.getSerializable("rightTeam") != null)) {

            gameStats = (actionTracker) savedInstanceState.getSerializable("gameStats");


            ArrayList<String> leftTeam;
            ArrayList<String> rightTeam;

            leftTeam = (ArrayList<String>) savedInstanceState.getSerializable("leftTeam");
            rightTeam = (ArrayList<String>) savedInstanceState.getSerializable("rightTeam");

            leftTeamName.setText(leftTeam.get(0));
            rightTeamName.setText(rightTeam.get(0));
            leftTeam.remove(0);
            rightTeam.remove(0);


            for (int i = 0; i < leftTeam.size(); i++) {
                Button btn = new Button(this);
                btn.setText(leftTeam.get(i));
                layoutLeft.addView(btn);
                btn.setLayoutParams(param);
                btn.setId(i);
                btn.setOnClickListener(mainOnClickListener);
            }
            for (int i = 0; i < rightTeam.size(); i++) {
                Button btn = new Button(this);
                btn.setText(rightTeam.get(i));
                layoutRight.addView(btn);
                btn.setLayoutParams(param);
                btn.setId(i);
                btn.setOnClickListener(mainOnClickListener);
            }
            Toast.makeText(mainContext, "Restored State", Toast.LENGTH_SHORT).show();

        } else {

            startRosterLoad();

        }

        btnUndo.setOnClickListener(mainOnClickListener);
        btnPoint.setOnClickListener(mainOnClickListener);
        btnDrop.setOnClickListener(mainOnClickListener);
        btnPull.setOnClickListener(mainOnClickListener);
        btnD.setOnClickListener(mainOnClickListener);
        btnCatchD.setOnClickListener(mainOnClickListener);
        btnThrowAway.setOnClickListener(mainOnClickListener);
        btnMode.setOnClickListener(changeModeListener);

        changeState(autoState);

    }


    private void startRosterLoad() {
        boolean JSONExists = checkJSONExists();

        if (JSONExists){
            loadJSON();

            new AlertDialog.Builder(mainContext)
                    .setTitle("Load Roster?")
                    .setMessage("Load a new roster from the internet?")
                    .setPositiveButton("Load New Roster", new DialogInterface.OnClickListener() {
                        public void onClick(DialogInterface dialog, int whichButton) {
                            new fetchRoster(mainContext, myself).execute();
                        }
                    }).setNegativeButton("Use Current Roster", new DialogInterface.OnClickListener() {
                public void onClick(DialogInterface dialog, int whichButton) {
                    loadNewTeams();
                }
            }).show();
        } else {
            new fetchRoster(mainContext, myself).execute();
        }
    }

    private boolean checkJSONExists(){
        String strFileName = fileStorageDirectory + "/" + strAppDirectory + "/" + strRosterFileName;
        File file = new File(strFileName);
        return file.exists();
    }

    private void saveButtonVisibility() {
        int leftCount = layoutLeft.getChildCount();
        int rightCount = layoutRight.getChildCount();

        visibleState = new boolean[2][Math.max(leftCount,rightCount)];

        for (int i = 0; i < leftCount; i++){
            Button currentButton = (Button) layoutLeft.getChildAt(i);
            visibleState[0][i] = (currentButton.getVisibility() == View.VISIBLE);
        }
        for (int i = 0; i < rightCount; i++){
            Button currentButton = (Button) layoutRight.getChildAt(i);
            visibleState[1][i] = (currentButton.getVisibility() == View.VISIBLE);
        }
    }

    private void loadButtonVisibility() {

        int leftCount = layoutLeft.getChildCount();
        int rightCount = layoutRight.getChildCount();
        rosterChange = false;

        for (int i = 0; i < leftCount; i++) {
            Button currentButton = (Button) layoutLeft.getChildAt(i);
            currentButton.setGravity(Gravity.END);
            currentButton.setOnClickListener(mainOnClickListener);
            if (visibleState[0][i]) {
                currentButton.setVisibility(View.VISIBLE);
            } else {
                currentButton.setVisibility(View.INVISIBLE);
            }
            currentButton.setTypeface(null, Typeface.NORMAL);
        }
        for (int i = 0; i < rightCount; i++) {
            Button currentButton = (Button) layoutRight.getChildAt(i);
            currentButton.setGravity(Gravity.START);
            currentButton.setOnClickListener(mainOnClickListener);
            if (visibleState[1][i]) {
                currentButton.setVisibility(View.VISIBLE);
            } else {
                currentButton.setVisibility(View.INVISIBLE);
            }
            currentButton.setTypeface(null, Typeface.NORMAL);
        }
    }

    // Roster Schema:
    // https://parity-server.herokuapp.com/docs/#api-Teams-GetTeams
    public void loadJSON() {

        // return if game in progress
        if (gameStats.size() > 0){
            Toast.makeText(mainContext, "No loading in the middle of a game, save and clear first.", Toast.LENGTH_SHORT).show();
            return;
        }

        // Load JSON string
        String jsonString = null;
        try {
            String strFileName = fileStorageDirectory + "/" + strAppDirectory + "/" + strRosterFileName;

            BufferedReader reader = new BufferedReader(new FileReader(strFileName));
            StringBuilder sb = new StringBuilder();

            String line = null;
            while ((line = reader.readLine()) != null)
            {
                sb.append(line + "\n");
            }
            jsonString = sb.toString();
        }
        catch (Exception e) {
            Toast.makeText(mainContext, e.toString(), Toast.LENGTH_LONG).show();
        }

        // Parse JSON object
        rosterList = new allTeams();
        try {
            JSONObject responseObject = new JSONObject(jsonString);
            Iterator<String> iter = responseObject.keys();

            while(iter.hasNext()) {
                String teamName = iter.next();
                JSONObject teamObject = responseObject.getJSONObject(teamName);
                JSONArray malePlayers = teamObject.getJSONArray("malePlayers");
                JSONArray femalePlayers = teamObject.getJSONArray("femalePlayers");

                rosterList.addRosterName(teamName);

                for( int i = 0; i < malePlayers.length(); i++) {
                    rosterList.add(teamName, malePlayers.getString(i), true);
                }

                for( int i = 0; i < femalePlayers.length(); i++) {
                    rosterList.add(teamName, femalePlayers.getString(i), false);
                }
            }

        } catch (Exception e) {
            Toast.makeText(mainContext, e.toString(), Toast.LENGTH_LONG).show();
        }

        return;
    }

    public void loadNewTeams(){
        if (gameStats.size() > 0){
            Toast.makeText(mainContext, "No loading in the middle of a game, save and clear first.", Toast.LENGTH_SHORT).show();
            return;
        }
        new AlertDialog.Builder(mainContext)
                .setTitle("Choose Home Team")
                .setItems(rosterList.getTeams(), new DialogInterface.OnClickListener() {
                    public void onClick(DialogInterface dialog, int which) {
                        updateTeam(which, true);
                        new AlertDialog.Builder(mainContext)
                                .setTitle("Choose Away Team")
                                .setItems(rosterList.getTeams(), new DialogInterface.OnClickListener() {
                                    public void onClick(DialogInterface dialog, int which) {
                                        updateTeam(which, false);
                                        forceRosterChange = true;
                                        changeState(editState);
                                    }
                                }).show();
                    }
                }).show();
    }

    @Override
    public void onPause(){
        super.onPause();
        saveGameToFile(false); //catch all save file.  Just in case to capture data before possible data loss
    }

    @Override
    public void onBackPressed() {
        // Do nothing;
    }

    @SuppressLint("SetTextI18n")
    private void updateScore(){
        int tmpLeftScore = 0;
        int tmpRightScore = 0;

        int arrayLength = gameStats.size();

        for (int i = 0; i < arrayLength; i++) {
            if (gameStats.getAction(i).equals("+1")||gameStats.getAction(i).equals("-1")){
                if (gameStats.getName(i-1).equals(">>>>>>"))
                        tmpRightScore++;
                else if (gameStats.getName(i-1).equals("<<<<<<"))
                        tmpLeftScore++;
            }
        }
        leftScore.setText(Integer.toString(tmpLeftScore));
        rightScore.setText(Integer.toString(tmpRightScore));
    }

    @Override
    public boolean onCreateOptionsMenu(Menu menu) {
        // Inflate the menu items for use in the action bar
        MenuInflater inflater = getMenuInflater();
        inflater.inflate(R.menu.main_activity_actions, menu);
        mnuItmEditTeam = menu.findItem(R.id.action_edit_team_players);
        return super.onCreateOptionsMenu(menu);
    }

    @Override
    public boolean onOptionsItemSelected(MenuItem item) {
        // Handle presses on the action bar items

        switch (item.getItemId()) {
            case R.id.action_edit_team_players:
                if (rosterChange) {
                    Toast.makeText(mainContext, "Exit roster change mode first.", Toast.LENGTH_LONG).show();
                    return true;
                }
                if (!editOn) {
                    saveButtonVisibility();
                    changeState(editState);
                }else{
                    if (forceRosterChange){
                        changeState(rosterChangeState);
                    }else {
                        loadButtonVisibility();
                        changeState(previousState);
                    }
                }
                return true;
            case R.id.action_save_game:
                if (editOn){
                    Toast.makeText(mainContext, "Exit edit mode first.", Toast.LENGTH_LONG).show();
                    return true;
                }

                new AlertDialog.Builder(mainContext)
                        .setTitle("Save and Clear")
                        .setMessage("Are you sure sure?" )
                        .setPositiveButton("Yes", new DialogInterface.OnClickListener() {
                            public void onClick(DialogInterface dialog, int whichButton) {
                                bookkeeper.gameCompleted();
                                saveGameToFile(true);
                                uploadGame();
                                emailFile();
                                clearStats();
                                bookkeeper.startGame();
                            }
                        }).setNegativeButton("Cancel", new DialogInterface.OnClickListener() {
                    public void onClick(DialogInterface dialog, int whichButton) {
                        // Do nothing.
                    }
                }).show();

                return true;
            case R.id.action_half:
                if (editOn){
                    Toast.makeText(mainContext, "Exit edit mode first.", Toast.LENGTH_LONG).show();
                    return true;
                }
                half();
                return true;
            case R.id.load_roster_from_web:
                if (editOn){
                    Toast.makeText(mainContext, "Exit edit mode first.", Toast.LENGTH_LONG).show();
                    return true;
                }
                new fetchRoster(mainContext, this).execute();

                return true;
            default:
                return super.onOptionsItemSelected(item);
        }
    }

    private void clearStats(){
        leftTeamName.setText(getResources().getText(R.string.str_DefaultLeftTeam));
        rightTeamName.setText(getResources().getText(R.string.str_DefaultRightTeam));
        leftScore.setText("0");
        rightScore.setText("0");
        gameStats = new actionTracker(myself);
        updateScore();
        adapter.notifyDataSetChanged();
        layoutLeft.removeAllViews();
        layoutRight.removeAllViews();
        editOn = false;
        rosterChange = false;
        loadNewTeams();
    }

    private void updateTeam(int teamIndex, boolean isLeft){
        TextView tvTeamName = rightTeamName;
        LinearLayout llButtonLayout = layoutRight;
        int guyColour = getResources().getColor(R.color.rightGuysColour);
        int girlColour = getResources().getColor(R.color.rightGirlsColour);
        int intGirls = rosterList.sizeGirls(teamIndex);
        int intGuys = rosterList.sizeGuys(teamIndex);
        int gravity = Gravity.START;

        if (isLeft){
            tvTeamName = leftTeamName;
            llButtonLayout = layoutLeft;
            guyColour = getResources().getColor(R.color.leftGuysColour);
            girlColour = getResources().getColor(R.color.leftGirlsColour);
            gravity = Gravity.END;
        }
        tvTeamName.setText(rosterList.getTeamName(teamIndex));
        llButtonLayout.removeAllViews();


        for (int i = 0; i < intGuys; i++) {
            Button btn = new Button(this);
            btn.setBackgroundColor(guyColour);
            btn.setText(rosterList.getGuyName(teamIndex, i));
            llButtonLayout.addView(btn);
            btn.setLayoutParams(param);
            btn.setId(i);
            btn.setGravity(gravity);
            btn.setOnClickListener(changeTextListener);
        }
        for (int i = 0; i < intGirls; i++){
            Button btn = new Button(this);
            btn.setPadding(1, 1, 1, 1);
            btn.setBackgroundColor(girlColour);
            btn.setText(rosterList.getGirlName(teamIndex,i));
            llButtonLayout.addView(btn);
            btn.setLayoutParams(param);
            btn.setId(i+intGuys);
            btn.setGravity(gravity);
            btn.setOnClickListener(changeTextListener);
        }

    }

    private void createDefaultDirectories(){
        File folder = new File(fileStorageDirectory + "/" + strAppDirectory);
        boolean success;
        if (!folder.exists()) {
            Toast.makeText(mainContext, "Directory Does Not Exist, Create It", Toast.LENGTH_SHORT).show();
            success = folder.mkdir();
            if (success) {
                Toast.makeText(mainContext, "Directory Created: " + folder , Toast.LENGTH_SHORT).show();
            } else {
                Toast.makeText(mainContext, "Failed - Error", Toast.LENGTH_SHORT).show();
            }
        }

        folder = new File(fileStorageDirectory + "/" + strAppDirectory + "/" + strAutoSaveDirectory );
        if (!folder.exists()) {
            Toast.makeText(mainContext, "Directory Does Not Exist, Create It", Toast.LENGTH_SHORT).show();
            success = folder.mkdir();
            if (success) {
                Toast.makeText(mainContext, "Directory Created: " + folder, Toast.LENGTH_SHORT).show();
            } else {
                Toast.makeText(mainContext, "Failed - Error", Toast.LENGTH_SHORT).show();
            }
        }

        folder = new File(fileStorageDirectory + "/" + strAppDirectory + "/" + strFinalSaveDirectory );
        if (!folder.exists()) {
            Toast.makeText(mainContext, "Directory Does Not Exist, Create It", Toast.LENGTH_SHORT).show();
            success = folder.mkdir();
            if (success) {
                Toast.makeText(mainContext, "Directory Created: " + folder, Toast.LENGTH_SHORT).show();
            } else {
                Toast.makeText(mainContext, "Failed - Error", Toast.LENGTH_SHORT).show();
            }
        }

    }

    private void saveGameToFile(boolean isFinalSave) {
        if (gameStats.size() < 1){
            Toast.makeText(mainContext, "Nothing To Save", Toast.LENGTH_SHORT).show();
            return;
        }
        File folder = new File(fileStorageDirectory + "/" + strAppDirectory + "/" + strAutoSaveDirectory);
        if (isFinalSave){
            folder = new File(fileStorageDirectory + "/" + strAppDirectory + "/" + strFinalSaveDirectory);
        }
        createDefaultDirectories();

        SimpleDateFormat dateFormat = new SimpleDateFormat("yyyy-MM-dd_HH:mm:ss", Locale.CANADA);
        Date date = new Date();
        String timeStamp = dateFormat.format(date);

        String filename = leftTeamName.getText().toString().replace("#","") + "_VS_" + rightTeamName.getText().toString().replace("#","") + "_" + timeStamp +".csv";
        File file = new File(folder, filename);
        FileOutputStream fos;

        try {
            fos = new FileOutputStream(file);
            fos.write(gameStats.compileCSV().getBytes());
            fos.flush();
            fos.close();
        } catch (Exception e) {
            Toast.makeText(mainContext, e.toString(), Toast.LENGTH_LONG).show();
        }

        lastFileSaved = file;
        Toast.makeText(mainContext, folder + "/" + filename + " Saved", Toast.LENGTH_LONG).show();
    }

    private void uploadGame() {
        try {
            JSONObject jsonObject = new JSONObject();
            jsonObject.accumulate("league", "ocua_16-17");

            // server will calc the week for now.
            // it would be nice if the client knew what
            // week it was working for though.
            //jsonObject.accumulate("week", 1);

            JSONObject teams = new JSONObject();
            String leftTeam = leftTeamName.getText().toString();
            String rightTeam = rightTeamName.getText().toString();
            teams.accumulate(leftTeam, new JSONArray(rosterList.getPlayers(leftTeam)) );
            teams.accumulate(rightTeam, new JSONArray(rosterList.getPlayers(rightTeam)) );
            jsonObject.accumulate("teams", teams);

            String eventString = gameStats.compileCSV();
            String[] eventStringArray = eventString.split("\n");
            jsonObject.accumulate("event_string", new JSONArray(eventStringArray));

            JSONObject events = bookkeeper.serialize();
            jsonObject.accumulate("events", events);

            String json = jsonObject.toString();

            new uploadGame(mainContext).execute(json);

            return;
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private void emailFile(){
        Intent email = new Intent(Intent.ACTION_SEND);
        email .setType("text/csv");
        email .putExtra(Intent.EXTRA_SUBJECT, lastFileSaved.getName());
        email .putExtra(Intent.EXTRA_EMAIL, new String[]{"mmasse@gmail.com"});
        email .putExtra(Intent.EXTRA_STREAM, Uri.parse("file://" + lastFileSaved.toString()));
        startActivity(Intent.createChooser(email, "Email:"));
    }

    private class ButtonPress extends AsyncTask <Button, Button, Long> {

        @SuppressWarnings("ResourceType")
        @Override
        protected Long doInBackground(Button... btns) {

            if (btns.length == 1) {
                if (btns[0].getParent() == layoutLeft) {
                    if ((gameStats.size() < 1) || (gameStats.getAction(0).equals("Time"))) {
                        discPossession = left;
                    } else {
                        if (gameStats.getAction(0).equals("")) {
                            gameStats.setAction(0, "Pass");
                            bookkeeper.recordPass((btns[0]).getText().toString());
                        }
                    }
                    //noinspection ResourceType,ResourceType
                    gameStats.add(0, (btns[0]).getText().toString(), "" );
                    bookkeeper.recordFirstActor(btns[0].getText().toString());

                }else if (btns[0].getParent() == layoutRight) {
                    if ((gameStats.size() < 1) || (gameStats.getAction(0).equals("Time"))) {
                        discPossession = right;
                    } else {
                        if (gameStats.getAction(0).equals("")) {
                            gameStats.setAction(0, "Pass");
                            bookkeeper.recordPass((btns[0]).getText().toString());
                        }
                    }
                    gameStats.add(0, (btns[0]).getText().toString(), "" );
                    bookkeeper.recordFirstActor(btns[0].getText().toString());

                }else if ((btns[0] == btnD)) {
                    gameStats.setAction(0, (btns[0].getText().toString()));
                    bookkeeper.recordD();
                }else if ((btns[0] == btnCatchD)){
                    gameStats.setAction(0, (btnD.getText().toString()));
                    bookkeeper.recordCatchD();
                    gameStats.add(0, gameStats.getName(0), "" );
                }else if ((btns[0] == btnDrop)||(btns[0] == btnPull)||(btns[0] == btnThrowAway)) {
                    discPossession = !discPossession;
                    if (btns[0] == btnPull) {
                        //The pull is an edge case for possession; the team that starts with possession isn't actually on offense.
                        //In this case we'll re-record the offense/defense players after the possession has been set
                        recordActivePlayers();
                    }
                    ButtonActionInterpreter.interpretButton(btns[0], bookkeeper);
                    gameStats.setAction(0,btns[0].getText().toString());
                    if (discPossession) {
                        gameStats.add(0, ">>>>>>", "Direction" );
                    } else {
                        gameStats.add(0, "<<<<<<", "Direction" );
                    }

                }else if (btns[0] == btnPoint) {
                    int leftCount = layoutLeft.getChildCount();
                    int rightCount = layoutRight.getChildCount();

                    String leftText = "-1";
                    String rightText = "+1";
                    if (discPossession){
                        leftText = "+1";
                        rightText = "-1";
                    }
                    gameStats.setAction(0,btns[0].getText().toString());
                    bookkeeper.recordPoint();

                    for (int i = 0; i < leftCount; i++){
                        Button currentButton = (Button) layoutLeft.getChildAt(i);

                        if (currentButton.getVisibility() == View.VISIBLE)
                            gameStats.add(0,currentButton.getText().toString(),leftText);
                    }
                    for (int i = 0; i < rightCount; i++){
                        Button currentButton = (Button) layoutRight.getChildAt(i);

                        if (currentButton.getVisibility() == View.VISIBLE)
                            gameStats.add(0,currentButton.getText().toString(),rightText);
                    }

                    discPossession = !discPossession;
                    if (discPossession) {
                        gameStats.add(0, ">>>>>>", "Direction" );
                    } else {
                        gameStats.add(0, "<<<<<<", "Direction" );
                    }
                    requestUpdateScore = true;
                    requestChangeRoster = true;
                    forceRosterInvert = true;

                }else if (btns[0] == btnUndo){
                    //if rosterChange do nothing
                    if (rosterChange) {
                        //do nothing
                    } else if ((gameStats.size() > 1)) {

                        //undo past point is really annoying.
                        if ((gameStats.getAction(1).equals("+1"))||(gameStats.getAction(1).equals("-1"))){
                            requestUpdateButtons = true;
                            arrayUndoNames = new ArrayList<String>();
                            while ((gameStats.getAction(1).equals("+1"))||(gameStats.getAction(1).equals("-1"))) {
                                arrayUndoNames.add(gameStats.getName(1));
                                gameStats.remove(1);
                            }
                        }

                        if (gameStats.getAction(0).equals("Time")) {
                            requestHalf = true;
                        }else{
                            if (gameStats.getAction(0).equals("Direction")) {
                                gameStats.setAction(1, "");
                                discPossession = !discPossession;
                            }else if (gameStats.getAction(1).equals("Pass")){
                                gameStats.setAction(1, "");
                            }
                            gameStats.remove(0);
                            requestUpdateScore = true;
                        }
                        bookkeeper.undo();
                    }else if (gameStats.size() > 0) {
                        gameStats.remove(0);
                        bookkeeper.undo();
                    }
                }

                runOnUiThread(new Runnable() {
                    @Override
                    public void run() {

                        if (btnLastButtonClicked == btnUndo && rosterChange) {
                            loadButtonVisibility();
                            Toast.makeText(mainContext, "Roster Change OFF and reverted back.", Toast.LENGTH_SHORT).show();
                        }
                        if (requestHalf) {
                            requestHalf = false;
                            half();
                        }
                        if (requestUpdateScore) {
                            requestUpdateScore = false;
                            updateScore();
                        }
                        if (requestChangeRoster) {
                            requestChangeRoster = false;
                            changeState(rosterChangeState);
                        } else {
                            changeState(autoState);
                        }
                        if (requestUpdateButtons) {
                            requestUpdateButtons = false;
                            int leftCount = layoutLeft.getChildCount();
                            int rightCount = layoutRight.getChildCount();

                            for (int i = 0; i < leftCount; i++)
                                layoutLeft.getChildAt(i).setVisibility(View.INVISIBLE);
                            for (int i = 0; i < rightCount; i++)
                                layoutRight.getChildAt(i).setVisibility(View.INVISIBLE);

                            for (int j = 0; j < arrayUndoNames.size(); j++) {
                                for (int i = 0; i < leftCount; i++)
                                    if (((Button) layoutLeft.getChildAt(i)).getText().toString().equals(arrayUndoNames.get(j)))
                                        layoutLeft.getChildAt(i).setVisibility(View.VISIBLE);
                                for (int i = 0; i < rightCount; i++)
                                    if (((Button) layoutRight.getChildAt(i)).getText().toString().equals(arrayUndoNames.get(j)))
                                        layoutRight.getChildAt(i).setVisibility(View.VISIBLE);
                            }
                        }
                        adapter.notifyDataSetChanged();
                    }
                });
            }
            return null;
        }
    }

    private void changeState(int change) {
        int leftCount = layoutLeft.getChildCount();
        int rightCount = layoutRight.getChildCount();

        if (change == autoState ){

            //Determine state automatically.
            if (gameStats.size() < 1) {
                change = startState;
            }else if (gameStats.size() == 1) {
                change = pullState;
            }else if (gameStats.getAction(0).equals("Direction")){
                change = whoPickedUpDiscState;
            }else if (gameStats.size() > 2) {
                if (gameStats.getAction(0).equals("Time")) {
                    change = startState;
                }else if (gameStats.getAction(1).equals("Time")){
                    change = pullState;
                }else if ((gameStats.getAction(2).equals("+1")) || (gameStats.getAction(2).equals("-1")) ||  (gameStats.getAction(2).equals("Pull"))) {
                    change = firstThrowQuebecVariantState;
                }else if (gameStats.getAction(0).equals("D")){
                    change = whoPickedUpDiscState;
                }else if ((gameStats.getAction(1).equals("D")) || (gameStats.getAction(2).equals("Drop"))){
                    change = firstActionState;
                }else if ((gameStats.getAction(1).equals("Direction")) && (!gameStats.getAction(2).equals("+1")) && (!gameStats.getAction(2).equals("-1")) && (!gameStats.getAction(2).equals("Drop")) && (!gameStats.getAction(2).equals("Pull"))){
                    change = firstDState;
                }else{
                    change = normalState;
                }
            }else{
                change = normalState;
            }
        }

        if ((currentState == change)&&(change != normalState)) {
            return;
        }

        //if editOn turn edit off.
        if (editOn && (change != editState)){
            editOn = false;
            leftTeamName.setGravity(Gravity.START);
            rightTeamName.setGravity(Gravity.END);
            mnuItmEditTeam.setTitle(R.string.str_action_edit_team_players);

            for (int i = 0; i < leftCount; i++){
                ((Button) layoutLeft.getChildAt(i)).setGravity(Gravity.CENTER);
                layoutLeft.getChildAt(i).setOnClickListener(mainOnClickListener);
            }
            for (int i = 0; i < rightCount; i++){
                ((Button) layoutRight.getChildAt(i)).setGravity(Gravity.CENTER);
                layoutRight.getChildAt(i).setOnClickListener(mainOnClickListener);
            }
            if (!forceRosterChange)
                loadButtonVisibility();
        }

        //if rosterChange on turn it off
        if (rosterChange && (change != rosterChangeState)) {
            int leftVisible = 0;
            int rightVisible = 0;

            for (int i = 0; i < leftCount; i++) {
                Button currentButton = (Button) layoutLeft.getChildAt(i);
                if (currentButton.getTypeface() != null)
                    leftVisible++;
            }
            for (int i = 0; i < rightCount; i++) {
                Button currentButton = (Button) layoutRight.getChildAt(i);
                if (currentButton.getTypeface() != null)
                    rightVisible++;
            }

            int teamSize = 6;

            boolean leftCorrectNumPlayers = leftVisible == teamSize;
            boolean rightCorrectNumPlayers = rightVisible == teamSize;

            if (leftCorrectNumPlayers&&rightCorrectNumPlayers) {

                rosterChange = false;
                forceRosterChange = false;
                leftPlayers = new ArrayList<String>();
                rightPlayers = new ArrayList<String>();
                for (int i = 0; i < leftCount; i++) {
                    Button currentButton = (Button) layoutLeft.getChildAt(i);
                    currentButton.setGravity(Gravity.END);
                    currentButton.setOnClickListener(mainOnClickListener);
                    if (currentButton.getTypeface() != null) {
                        currentButton.setVisibility(View.VISIBLE);
                        String playerName = currentButton.getText().toString();
                        leftPlayers.add(playerName);
                    } else {
                        currentButton.setVisibility(View.INVISIBLE);
                    }
                    currentButton.setTypeface(null, Typeface.NORMAL);
                }
                for (int i = 0; i < rightCount; i++) {
                    Button currentButton = (Button) layoutRight.getChildAt(i);
                    currentButton.setGravity(Gravity.START);
                    currentButton.setOnClickListener(mainOnClickListener);
                    if (currentButton.getTypeface() != null) {
                        currentButton.setVisibility(View.VISIBLE);
                        String playerName = currentButton.getText().toString();
                        rightPlayers.add(playerName);
                    } else {
                        currentButton.setVisibility(View.INVISIBLE);
                    }
                    currentButton.setTypeface(null, Typeface.NORMAL);
                }

                recordActivePlayers();
                Toast.makeText(mainContext, "Done selecting active players", Toast.LENGTH_SHORT).show();
                btnMode.setText(R.string.mode_button_edit);
            } else {
                String error = "Incorrect number of players";
                if (!leftCorrectNumPlayers) {
                    error += String.format("\nLeft side: %d/%d selected", leftVisible, teamSize);
                }

                if (!rightCorrectNumPlayers) {
                    error += String.format("\nRight side: %d/%d selected", rightVisible, teamSize);
                }

                Toast.makeText(mainContext, error, Toast.LENGTH_LONG).show();
                return;
            }
        }

        if (currentState != rosterChangeState || currentState != rosterChangeState)
            previousState=currentState;
        currentState=change;

        switch (change) {
            case normalState:
                btnPoint.setEnabled(true);
                btnDrop.setEnabled(true);
                btnD.setEnabled(false);
                btnCatchD.setEnabled(false);
                btnThrowAway.setEnabled(true);
                btnUndo.setEnabled(true);
                btnPull.setEnabled(false);
                btnMode.setEnabled(true);
                for (int i = 0; i < leftCount; i++){
                    if (((Button) layoutLeft.getChildAt(i)).getText().equals(gameStats.getName(0))){
                        layoutLeft.getChildAt(i).setEnabled(false);
                    } else {
                        layoutLeft.getChildAt(i).setEnabled(discPossession);
                    }
                }
                for (int i = 0; i < rightCount; i++){
                    if (((Button) layoutRight.getChildAt(i)).getText().equals(gameStats.getName(0))){
                        layoutRight.getChildAt(i).setEnabled(false);
                    } else {
                        layoutRight.getChildAt(i).setEnabled(!discPossession);
                    }
                }
                break;
            case firstThrowQuebecVariantState:
                btnPoint.setEnabled(false);
                btnDrop.setEnabled(false);
                btnD.setEnabled(false);
                btnCatchD.setEnabled(false);
                btnThrowAway.setEnabled(true);
                btnUndo.setEnabled(true);
                btnPull.setEnabled(false);
                btnMode.setEnabled(true);
                for (int i = 0; i < leftCount; i++){
                    if (((Button) layoutLeft.getChildAt(i)).getText().equals(gameStats.getName(0))){
                        layoutLeft.getChildAt(i).setEnabled(false);
                    } else {
                        layoutLeft.getChildAt(i).setEnabled(discPossession);
                    }
                }
                for (int i = 0; i < rightCount; i++){
                    if (((Button) layoutRight.getChildAt(i)).getText().equals(gameStats.getName(0))){
                        layoutRight.getChildAt(i).setEnabled(false);
                    } else {
                        layoutRight.getChildAt(i).setEnabled(!discPossession);
                    }
                }
                break;
            case firstDState:
                btnPoint.setEnabled(true);
                btnDrop.setEnabled(false);
                btnD.setEnabled(true);
                btnCatchD.setEnabled(true);
                btnThrowAway.setEnabled(true);
                btnUndo.setEnabled(true);
                btnPull.setEnabled(false);
                btnMode.setEnabled(true);
                for (int i = 0; i < leftCount; i++){
                    if (((Button) layoutLeft.getChildAt(i)).getText().equals(gameStats.getName(0))){
                        layoutLeft.getChildAt(i).setEnabled(false);
                    } else {
                        layoutLeft.getChildAt(i).setEnabled(discPossession);
                    }
                }
                for (int i = 0; i < rightCount; i++){
                    if (((Button) layoutRight.getChildAt(i)).getText().equals(gameStats.getName(0))){
                        layoutRight.getChildAt(i).setEnabled(false);
                    } else {
                        layoutRight.getChildAt(i).setEnabled(!discPossession);
                    }
                }
                break;
            case firstActionState:
                btnPoint.setEnabled(true);
                btnDrop.setEnabled(false);
                btnD.setEnabled(false);
                btnCatchD.setEnabled(false);
                btnThrowAway.setEnabled(true);
                btnUndo.setEnabled(true);
                btnPull.setEnabled(false);
                btnMode.setEnabled(true);
                for (int i = 0; i < leftCount; i++){
                    if (((Button) layoutLeft.getChildAt(i)).getText().equals(gameStats.getName(0))){
                        layoutLeft.getChildAt(i).setEnabled(false);
                    } else {
                        layoutLeft.getChildAt(i).setEnabled(discPossession);
                    }
                }
                for (int i = 0; i < rightCount; i++){
                    if (((Button) layoutRight.getChildAt(i)).getText().equals(gameStats.getName(0))){
                        layoutRight.getChildAt(i).setEnabled(false);
                    } else {
                        layoutRight.getChildAt(i).setEnabled(!discPossession);
                    }
                }
                break;
            case startState:
                btnPoint.setEnabled(false);
                btnDrop.setEnabled(false);
                btnD.setEnabled(false);
                btnCatchD.setEnabled(false);
                btnThrowAway.setEnabled(false);
                btnPull.setEnabled(false);
                btnUndo.setEnabled(true);
                btnMode.setEnabled(true);
                for (int i = 0; i < leftCount; i++){
                    layoutLeft.getChildAt(i).setEnabled(true);
                }
                for (int i = 0; i < rightCount; i++){
                    layoutRight.getChildAt(i).setEnabled(true);
                }
                break;
            case pullState:
                btnPoint.setEnabled(false);
                btnDrop.setEnabled(false);
                btnD.setEnabled(false);
                btnThrowAway.setEnabled(false);
                btnUndo.setEnabled(true);
                btnPull.setEnabled(true);
                btnMode.setEnabled(true);
                for (int i = 0; i < leftCount; i++){
                    layoutLeft.getChildAt(i).setEnabled(false);
                }
                for (int i = 0; i < rightCount; i++){
                    layoutRight.getChildAt(i).setEnabled(false);
                }
                break;
            case whoPickedUpDiscState:
                btnPoint.setEnabled(false);
                btnDrop.setEnabled(false);
                btnD.setEnabled(false);
                btnCatchD.setEnabled(false);
                btnThrowAway.setEnabled(false);
                btnUndo.setEnabled(true);
                btnPull.setEnabled(false);
                btnMode.setEnabled(true);
                for (int i = 0; i < leftCount; i++){
                    layoutLeft.getChildAt(i).setEnabled(discPossession);
                }
                for (int i = 0; i < rightCount; i++){
                    layoutRight.getChildAt(i).setEnabled(!discPossession);
                }
                break;
            case editState:
                editOn = true;
                btnPoint.setEnabled(false);
                btnDrop.setEnabled(false);
                btnD.setEnabled(false);
                btnCatchD.setEnabled(false);
                btnThrowAway.setEnabled(false);
                btnUndo.setEnabled(false);
                btnPull.setEnabled(false);
                btnMode.setEnabled(false);
                saveButtonVisibility();

                mnuItmEditTeam.setTitle(R.string.str_action_stop_edit_team_players);

                for (int i = 0; i < leftCount; i++){
                    Button currentButton = (Button) layoutLeft.getChildAt(i);
                    currentButton.setEnabled(true);
                    currentButton.setGravity(Gravity.END);
                    currentButton.setOnClickListener(changeTextListener);
                    currentButton.setVisibility(View.VISIBLE);
                }
                for (int i = 0; i < rightCount; i++){
                    Button currentButton = (Button) layoutRight.getChildAt(i);
                    currentButton.setEnabled(true);
                    currentButton.setGravity(Gravity.START);
                    currentButton.setOnClickListener(changeTextListener);
                    currentButton.setVisibility(View.VISIBLE);
                }
                break;
            case rosterChangeState:
                rosterChange = true;
                saveButtonVisibility();
                boolean leftAllEnabled = true;
                boolean rightAllEnabled = true;
                for (int i = 0; i < leftCount; i++){
                    Button currentButton = (Button) layoutLeft.getChildAt(i);

                    if (currentButton.getVisibility() != View.VISIBLE)
                        leftAllEnabled = false;

                }
                for (int i = 0; i < rightCount; i++){
                    Button currentButton = (Button) layoutRight.getChildAt(i);
                    if (currentButton.getVisibility() != View.VISIBLE)
                        rightAllEnabled = false;
                }
                btnPoint.setEnabled(false);
                btnDrop.setEnabled(false);
                btnD.setEnabled(false);
                btnCatchD.setEnabled(false);
                btnThrowAway.setEnabled(false);
                btnUndo.setEnabled(!forceRosterChange);
                btnPull.setEnabled(false);
                btnMode.setEnabled(true);

                int intTypeON = Typeface.BOLD;
                int intTypeOFF = Typeface.NORMAL;

                if (forceRosterInvert) {
                    forceRosterInvert = false;
                    intTypeON = Typeface.NORMAL;
                    intTypeOFF = Typeface.BOLD;
                }
                for (int i = 0; i < leftCount; i++){
                    Button currentButton = (Button) layoutLeft.getChildAt(i);

                    currentButton.setEnabled(true);

                    currentButton.setGravity(Gravity.END);
                    currentButton.setOnClickListener(toggleUserListener);
                    if (currentButton.getVisibility() == View.VISIBLE && !leftAllEnabled){
                        currentButton.setTypeface(null, intTypeON);
                    }else{
                        currentButton.setTypeface(null, intTypeOFF);
                    }
                    currentButton.setVisibility(View.VISIBLE);

                }
                for (int i = 0; i < rightCount; i++){
                    Button currentButton = (Button) layoutRight.getChildAt(i);
                    currentButton.setEnabled(true);
                    currentButton.setGravity(Gravity.START);
                    currentButton.setOnClickListener(toggleUserListener);

                    if (currentButton.getVisibility()== View.VISIBLE && !rightAllEnabled){
                        currentButton.setTypeface(null, intTypeON);
                    }else{
                        currentButton.setTypeface(null, intTypeOFF);
                    }
                    currentButton.setVisibility(View.VISIBLE);
                }

                Toast.makeText(mainContext, "Selecting active players", Toast.LENGTH_SHORT).show();
                btnMode.setText(R.string.mode_button_done);

                break;
            case halfState:
                btnPoint.setEnabled(false);
                btnDrop.setEnabled(false);
                btnD.setEnabled(false);
                btnCatchD.setEnabled(false);
                btnThrowAway.setEnabled(false);
                btnUndo.setEnabled(true);
                btnPull.setEnabled(false);
                btnMode.setEnabled(true);
                for (int i = 0; i < leftCount; i++){
                    layoutLeft.getChildAt(i).setEnabled(true);
                }
                for (int i = 0; i < rightCount; i++){
                    layoutRight.getChildAt(i).setEnabled(true);
                }
                break;
        }
    }

    private void recordActivePlayers() {
        if (discPossession == left) {
            bookkeeper.recordActivePlayers(leftPlayers, rightPlayers);
        } else {
            bookkeeper.recordActivePlayers(rightPlayers, leftPlayers);
        }
    }

    private void half() {
        if ( gameStats.getName(0).equals("Half") || ((gameStats.size() > 1) && (gameStats.getAction(1).equals("+1")|| gameStats.getAction(1).equals("-1")))) {
            if (gameStats.size() > 0) {
                if (gameStats.getName(0).equals("Half")) {
                    gameStats.remove(0);
                    changeState(autoState);
                }else {
                    gameStats.add(0, "Half", "Time");
                    changeState(rosterChangeState);
                }
                adapter.notifyDataSetChanged();
            }
        } else
            Toast.makeText(mainContext, "You can only have half between points", Toast.LENGTH_LONG).show();
     }

    @Override
    public void onCreateContextMenu(ContextMenu menu, View v, ContextMenu.ContextMenuInfo menuInfo) {
        super.onCreateContextMenu(menu, v, menuInfo);
        btnLastButtonClicked = (Button) v;
        menu.setHeaderTitle(((Button) v).getText());
        menu.add(0, v.getId(), 0, "Add Male");
        menu.add(0, v.getId(), 0, "Add Female");
        menu.add(0, v.getId(), 0, "Delete");

    }

    @Override
    public boolean onContextItemSelected(MenuItem item) {
        if (item.getTitle() == "Add Male") {
            gameStats.setAction(0, "Add Male");
        } else if (item.getTitle() == "Add Female") {
            gameStats.setAction(0, "Add Female");
        } else if (item.getTitle() == "Delete") {
            ((LinearLayout) btnLastButtonClicked.getParent()).removeView(btnLastButtonClicked);
        } else {
            return false;
        }
        adapter.notifyDataSetChanged();
        return true;
    }

    private class statsTickerAdapter extends BaseAdapter {
    //todo fix inefficient statsTicker somehow.
        final LayoutInflater inflater = getLayoutInflater();

        class ViewHolderItem {
            TextView name;
            TextView action;
        }

        @Override
        public int getCount() {
            return gameStats.size();
        }

        @Override
        public String getItem(int position) {
            return gameStats.getName(position);
        }

        @Override
        public long getItemId(int position) {
            return position;
        }

        @Override
        public View getView(int position, View convertView, ViewGroup parent) {
            ViewHolderItem viewHolder;
            if (convertView == null){
                viewHolder = new ViewHolderItem();
                convertView = inflater.inflate(R.layout.list_layout, parent, false);
                viewHolder.name = (TextView) convertView.findViewById(R.id.name);
                viewHolder.action = (TextView) convertView.findViewById(R.id.action);
                convertView.setTag(viewHolder);
            }else{
                viewHolder = (ViewHolderItem) convertView.getTag();
            }
            viewHolder.name.setText(gameStats.getName(position));
            viewHolder.action.setText(gameStats.getAction(position));
            return convertView;
        }
    }
}

/**
//Shared Preferences Code
 init
 final SharedPreferences prefs = PreferenceManager.getDefaultSharedPreferences(this);

 get
 int initialValue = prefs.getInt("color_2", 0xFF000000);

 set forget
 SharedPreferences.Editor editor = prefs.edit();00);
 editor.putInt("color_2", colorDialog.getColor());
 editor.commit();
*/