package io.masse.parityleaguestats;

import android.app.Activity;
import android.content.Intent;
import android.app.AlertDialog;
import android.content.Context;
import android.content.DialogInterface;
import android.graphics.Typeface;
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
import java.util.ArrayList;

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
                String deleteTxt = "Delete " + btnLastButtonClicked.getText();

                new AlertDialog.Builder(context)
                        .setTitle("Edit")
                        .setItems(new String[]{ deleteTxt, "Cancel" },
                            new DialogInterface.OnClickListener() {
                                public void onClick(DialogInterface dialog, int which) {
                                switch (which) {
                                    case 0: //delete player
                                        ((LinearLayout) btnLastButtonClicked.getParent()).removeView(btnLastButtonClicked);
                                        break;
                                    case 1: //do nothing
                                        break;
                                }
                                }
                            }).show();
            }
        };

        final Button editButton = (Button) findViewById(R.id.btnAddPlayer);
        editButton.setOnClickListener(new View.OnClickListener() {
            public void onClick(View v) {
            final AutoCompleteTextView input = new AutoCompleteTextView(v.getContext());
            input.setInputType(InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_VARIATION_PERSON_NAME | InputType.TYPE_TEXT_FLAG_CAP_WORDS);

            final String[] teams = new String[] {
                leftTeamName.getText().toString(),
                rightTeamName.getText().toString()
            };

            new AlertDialog.Builder(context)
                .setTitle("Choose Teams")
                .setItems(teams, new DialogInterface.OnClickListener() {
                    public void onClick(DialogInterface dialog, int which) {
                        addSubstitutePlayer(input, teams[which]);
                    }
                }).show();
            }
        });


        final Button finishButton = (Button) findViewById(R.id.btnFinish);
        finishButton.setOnClickListener(new View.OnClickListener() {
                                            public void onClick(View v) {
                                                Intent intent = new Intent(context, Stats.class);

                                                ArrayList<String>leftPlayers = new ArrayList<>();
                                                ArrayList<String> rightPlayers = new ArrayList<>();

                                                int leftCount = layoutLeft.getChildCount();
                                                int rightCount = layoutRight.getChildCount();

                                                for (int i = 0; i < leftCount; i++) {
                                                    Button currentButton = (Button) layoutLeft.getChildAt(i);
                                                    String playerName = currentButton.getText().toString();
                                                    leftPlayers.add(playerName);
                                                }
                                                for (int i = 0; i < rightCount; i++) {
                                                    Button currentButton = (Button) layoutRight.getChildAt(i);
                                                    String playerName = currentButton.getText().toString();
                                                    rightPlayers.add(playerName);
                                                }

                                                intent.putExtra("leftTeamName", leftTeamName.getText().toString());
                                                intent.putExtra("rightTeamName", leftTeamName.getText().toString());
                                                intent.putExtra("leftPlayers", leftPlayers);
                                                intent.putExtra("leftRightPlayers", rightPlayers);

                                                startActivity(intent);
                                            }
                                        });

        // this probably shouldn't always run since this won't make sense if
        // coming back to this state.
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

    private void addSubstitutePlayer(final AutoCompleteTextView input, final String team) {
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

                // This all is kind of gross
                final Gender gender = teams.getPlayerGender(playerName);
                if (gender == Gender.Unknown) {
                    new AlertDialog.Builder(context)
                        .setTitle("Select Gender")
                        .setMessage(playerName)
                        .setPositiveButton("Female", new DialogInterface.OnClickListener() {
                            @Override
                            public void onClick(DialogInterface dialogInterface, int i) {
                                addPlayerButton(team, txtButtonText, Gender.Female);
                            }
                        })
                        .setNegativeButton("Male", new DialogInterface.OnClickListener() {
                            @Override
                            public void onClick(DialogInterface dialogInterface, int i) {
                                addPlayerButton(team, txtButtonText, Gender.Male);
                            }
                        }).show();
                } else {
                    addPlayerButton(team, txtButtonText, gender);
                }

                }
            }).setNegativeButton("Cancel", new DialogInterface.OnClickListener() {
                public void onClick(DialogInterface dialog, int whichButton) {
                    // Do nothing.
                }
            }).show();
    }

    private void addPlayerButton(String teamName, String name, Gender gender){
        final Button btn = new Button(context);

        int gravity;
        customLinearLayout layout;

        if (teamName == leftTeamName.getText().toString()) {
            layout = layoutLeft;
            gravity = Gravity.END;
        } else {
            layout = layoutRight;
            gravity = Gravity.START;
        }

        if (gender == Gender.Male) {
            layout.addView(btn, findFemaleStartIndex(layout));
        } else {
            layout.addView(btn);
        }

        btn.setText(name);
        btn.setLayoutParams(param);
        btn.setId(layout.getChildCount() - 1);
        btn.setTag(gender);
        btn.setOnClickListener(teamEditListener);
        btn.setGravity(gravity);
        btn.setBackgroundColor(getResources().getColor(gender.colorId));
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
