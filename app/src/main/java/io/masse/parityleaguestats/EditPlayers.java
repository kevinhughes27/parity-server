package io.masse.parityleaguestats;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.Context;
import android.content.DialogInterface;
import android.os.Bundle;
import android.os.Environment;
import android.text.InputType;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.widget.ArrayAdapter;
import android.widget.AutoCompleteTextView;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Toast;

import java.io.File;

import io.masse.parityleaguestats.customLayout.customLinearLayout;
import io.masse.parityleaguestats.model.Gender;
import io.masse.parityleaguestats.model.Team;
import io.masse.parityleaguestats.model.Teams;
import io.masse.parityleaguestats.tasks.fetchRoster;

public class EditPlayers extends Activity {
    private static final File fileStorageDirectory = Environment.getExternalStorageDirectory();
    private static final String strAppDirectory = "ParityLeagueStats";
    private static final String strRosterFileName = "roster.JSON";

    TextView leftTeamName, rightTeamName;
    private customLinearLayout layoutLeft;
    private customLinearLayout layoutRight;
    private LinearLayout.LayoutParams param;
    private Button btnLastButtonClicked;
    private View.OnClickListener teamEditListener;
    private Context context;
    private final EditPlayers myself = this;

    private Teams teams;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_edit_players);

        context = this;

        teams = new Teams();

        leftTeamName = (TextView) findViewById(R.id.leftTeam);
        rightTeamName = (TextView) findViewById(R.id.rightTeam);

        layoutLeft = (customLinearLayout) findViewById(R.id.layoutLeftNames);
        layoutRight = (customLinearLayout) findViewById(R.id.layoutRightNames);

        int margin = getResources().getDimensionPixelSize(R.dimen.button_all_margin);
        param = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT, 1.0f);
        param.setMargins(margin,margin,margin,margin);

        teamEditListener = new View.OnClickListener() {
            @Override
            public void onClick(View view) {
                btnLastButtonClicked = (Button) view;
                final AutoCompleteTextView input = new AutoCompleteTextView(view.getContext());
                input.setInputType(InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_VARIATION_PERSON_NAME | InputType.TYPE_TEXT_FLAG_CAP_WORDS);

                new AlertDialog.Builder(context)
                        .setTitle("Edit")
                        .setItems(new String[]{
                                        "Add Substitute Player",
                                        "Delete " + btnLastButtonClicked.getText(),
                                        "Cancel"},
                                new DialogInterface.OnClickListener() {
                                    public void onClick(DialogInterface dialog, int which) {
                                        switch (which) {
                                            case 0: //add substitute player
                                                addSubstitutePlayer(input);
                                                break;
                                            case 1: //delete player
                                                ((LinearLayout) btnLastButtonClicked.getParent()).removeView(btnLastButtonClicked);
                                                break;
                                            case 2: //do nothing
                                                break;
                                        }
                                    }
                                }).show();
            }
        };

        new fetchRoster(this, myself).execute();
    }

    public void loadJSON() {
        String strFileName = fileStorageDirectory + "/" + strAppDirectory + "/" + strRosterFileName;

        try {
            teams.load(strFileName);
        }
        catch (Exception e) {
            Toast.makeText(this, e.toString(), Toast.LENGTH_LONG).show();
        }
    }

    public void loadNewTeams() {
        new AlertDialog.Builder(context)
                .setTitle("Choose Home Team")
                .setItems(teams.getNames(), new DialogInterface.OnClickListener() {
                    public void onClick(DialogInterface dialog, int which) {
                        Team team = teams.getTeam(which);
                        updateTeam(team, true);
                        new AlertDialog.Builder(context)
                                .setTitle("Choose Away Team")
                                .setItems(teams.getNames(), new DialogInterface.OnClickListener() {
                                    public void onClick(DialogInterface dialog, int which) {
                                        Team team = teams.getTeam(which);
                                        updateTeam(team, false);
                                    }
                                }).show();
                    }
                }).show();
    }

    private void updateTeam(Team team, boolean isLeft){
        TextView tvTeamName = rightTeamName;
        LinearLayout llButtonLayout = layoutRight;
        int guyColour = getResources().getColor(R.color.rightGuysColour);
        int girlColour = getResources().getColor(R.color.rightGirlsColour);
        int intGirls = team.sizeGirls();
        int intGuys = team.sizeGuys();
        int gravity = Gravity.START;

        if (isLeft){
            tvTeamName = leftTeamName;
            llButtonLayout = layoutLeft;
            guyColour = getResources().getColor(R.color.leftGuysColour);
            girlColour = getResources().getColor(R.color.leftGirlsColour);
            gravity = Gravity.END;
        }
        tvTeamName.setText(team.name);
        llButtonLayout.removeAllViews();


        for (int i = 0; i < intGuys; i++) {
            Button btn = new Button(this);
            btn.setBackgroundColor(guyColour);
            btn.setText(team.getGuyName(i));
            llButtonLayout.addView(btn);
            btn.setLayoutParams(param);
            btn.setId(i);
            btn.setTag(Gender.Male);
            btn.setGravity(gravity);
            btn.setOnClickListener(teamEditListener);
        }
        for (int i = 0; i < intGirls; i++){
            Button btn = new Button(this);
            btn.setPadding(1, 1, 1, 1);
            btn.setBackgroundColor(girlColour);
            btn.setText(team.getGirlName(i));
            llButtonLayout.addView(btn);
            btn.setLayoutParams(param);
            btn.setId(i+intGuys);
            btn.setTag(Gender.Female);
            btn.setGravity(gravity);
            btn.setOnClickListener(teamEditListener);
        }
    }

    private void addPlayerButton(LinearLayout parent, String name, Gender gender){
        final Button btn = new Button(context);
        if (gender == Gender.Male) {
            parent.addView(btn, findFemaleStartIndex(parent));
        } else {
            parent.addView(btn);
        }

        btn.setText(name);
        btn.setLayoutParams(param);
        btn.setId(parent.getChildCount() - 1);
        btn.setTag(gender);
        btn.setOnClickListener(teamEditListener);
        btn.setGravity(btnLastButtonClicked.getGravity());
        btn.setBackgroundColor(getResources().getColor(gender.colorId));
    }

    private void addSubstitutePlayer(final AutoCompleteTextView input) {
        input.setAdapter(new ArrayAdapter<String>(
                context,
                android.R.layout.simple_dropdown_item_1line,
                teams.allPlayers())
        );

        new AlertDialog.Builder(context)
                .setTitle("Add Substitute Player")
                .setMessage("Player Name")
                .setView(input)
                .setPositiveButton("Ok", new DialogInterface.OnClickListener() {
                    public void onClick(DialogInterface dialog, int whichButton) {
                        String playerName = input.getText().toString();
                        final String txtButtonText = playerName + "(S)";
                        final LinearLayout parent = (LinearLayout) btnLastButtonClicked.getParent();

                        // This all is kind of gross
                        final Gender gender = teams.getPlayerGender(playerName);
                        if (gender == Gender.Unknown) {
                            new AlertDialog.Builder(context)
                                    .setTitle("Select Gender")
                                    .setMessage(playerName)
                                    .setPositiveButton("Female", new DialogInterface.OnClickListener() {
                                        @Override
                                        public void onClick(DialogInterface dialogInterface, int i) {
                                            addPlayerButton(parent, txtButtonText, Gender.Female);
                                        }
                                    })
                                    .setNegativeButton("Male", new DialogInterface.OnClickListener() {
                                        @Override
                                        public void onClick(DialogInterface dialogInterface, int i) {
                                            addPlayerButton(parent, txtButtonText, Gender.Male);
                                        }
                                    })
                                    .show();
                        } else {
                            addPlayerButton(parent, txtButtonText, gender);
                        }

                    }
                }).setNegativeButton("Cancel", new DialogInterface.OnClickListener() {
            public void onClick(DialogInterface dialog, int whichButton) {
                // Do nothing.
            }
        }).show();
    }

    private int findFemaleStartIndex(LinearLayout parent) {
        int count = parent.getChildCount();
        for (int i = 0; i < count; i++) {
            Object child = parent.getChildAt(i).getTag();
            if (child == null) {
                continue;
            }

            Gender check = Gender.valueOf(Gender.class, child.toString());
            if (check == Gender.Female) {
                return i;
            }
        }

        return count;
    }
}
